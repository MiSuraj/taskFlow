require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const Tenant     = require('./src/models/Tenant');
const { getTenantModels, makeDbName } = require('./src/config/tenantDb');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

app.use('/api/tenants',  require('./src/routes/tenants'));
app.use('/api/auth',     require('./src/routes/auth'));
app.use('/api/tasks',    require('./src/routes/tasks'));
app.use('/api/users',    require('./src/routes/users'));
app.use('/api/projects', require('./src/routes/projects'));
app.use('/api/docs',     require('./src/routes/docs'));
app.use('/api/chat',     require('./src/routes/chat'));
app.use('/api/ai',       require('./src/routes/ai'));

// ── Tenant-scoped online users: socketId -> { userId, username, role, tenantSlug } ──
const onlineUsers = new Map();
// ── Doc room presence: roomKey -> Map<socketId, username> ──
const roomUsers = {};

const tenantRoom = (tenantSlug) => `tenant:${tenantSlug}`;
const docRoom = (tenantSlug, projectId) => `${tenantRoom(tenantSlug)}:doc:${projectId}`;
const chatRoom = (tenantSlug, roomId) => `${tenantRoom(tenantSlug)}:chat:${roomId}`;

const broadcastOnline = (tenantSlug) => {
  const list = [...new Set(
    [...onlineUsers.values()]
      .filter(u => u.tenantSlug === tenantSlug)
      .map(u => u.username)
  )];
  io.to(tenantRoom(tenantSlug)).emit('online-users', list);
};

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    if (!socket.user.dbName) return next(new Error('Tenant missing'));
    socket.models = getTenantModels(socket.user.dbName);
    next();
  } catch { next(new Error('Invalid token')); }
});

io.on('connection', (socket) => {
  const { id: userId, username, role } = socket.user;
  const { tenantSlug } = socket.user;
  socket.join(tenantRoom(tenantSlug));

  // Register as online
  onlineUsers.set(socket.id, { userId, username, role, tenantSlug });
  broadcastOnline(tenantSlug);

  // ── DOC COLLABORATION ──
  socket.on('join-doc', (projectId) => {
    const room = docRoom(tenantSlug, projectId);
    socket.join(room);
    if (!roomUsers[room]) roomUsers[room] = new Map();
    roomUsers[room].set(socket.id, username);
    io.to(room).emit('presence', Array.from(roomUsers[room].values()));
  });

  socket.on('doc-change', ({ projectId, sections, sectionIndex }) => {
    socket.to(docRoom(tenantSlug, projectId)).emit('doc-change', { sections, sectionIndex, editedBy: username });
  });

  socket.on('doc-save', async ({ projectId, sections }) => {
    try {
      const { ProjectDoc } = socket.models;
      const doc = await ProjectDoc.findOneAndUpdate(
        { project: projectId },
        { sections, lastEditedBy: userId },
        { new: true, upsert: true }
      ).populate('lastEditedBy', 'username');
      io.to(docRoom(tenantSlug, projectId)).emit('doc-saved', { lastEditedBy: doc.lastEditedBy?.username, updatedAt: doc.updatedAt });
    } catch (err) { console.error('doc-save error', err.message); }
  });

  socket.on('leave-doc', (projectId) => {
    const room = docRoom(tenantSlug, projectId);
    socket.leave(room);
    roomUsers[room]?.delete(socket.id);
    io.to(room).emit('presence', Array.from((roomUsers[room] || new Map()).values()));
  });

  // ── CHAT ──
  socket.on('join-chat', (roomId) => {
    socket.join(chatRoom(tenantSlug, roomId));
  });

  socket.on('leave-chat', (roomId) => {
    socket.leave(chatRoom(tenantSlug, roomId));
  });

  socket.on('chat-message', async ({ roomId, text, mentions = [] }) => {
    try {
      const { ChatMessage } = socket.models;
      const msg = await ChatMessage.create({ room: roomId, sender: userId, text, mentions });
      const populated = await msg.populate([
        { path: 'sender',   select: 'username role' },
        { path: 'mentions', select: 'username' },
      ]);
      io.to(chatRoom(tenantSlug, roomId)).emit('chat-message', populated);
    } catch (err) { console.error('chat-message error', err.message); }
  });

  socket.on('chat-react', async ({ messageId, emoji, roomId }) => {
    try {
      const { ChatMessage } = socket.models;
      const msg = await ChatMessage.findById(messageId);
      if (!msg) return;
      const existing = msg.reactions.find(r => r.emoji === emoji);
      if (existing) {
        const idx = existing.users.map(u => u.toString()).indexOf(userId);
        if (idx >= 0) existing.users.splice(idx, 1);
        else existing.users.push(userId);
        if (existing.users.length === 0) msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
      } else {
        msg.reactions.push({ emoji, users: [userId] });
      }
      await msg.save();
      const populated = await msg.populate([
        { path: 'sender',   select: 'username role' },
        { path: 'mentions', select: 'username' },
      ]);
      io.to(chatRoom(tenantSlug, roomId)).emit('chat-reaction', populated);
    } catch (err) { console.error('chat-react error', err.message); }
  });

  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(chatRoom(tenantSlug, roomId)).emit('typing', { username, isTyping });
  });

  // ── DISCONNECT ──
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    broadcastOnline(tenantSlug);
    for (const [room, users] of Object.entries(roomUsers)) {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        io.to(room).emit('presence', Array.from(users.values()));
      }
    }
  });
});

async function seedIfEmpty() {
  const count = await Tenant.countDocuments();
  if (count > 0) return;
  console.log('Seeding default organization...');
  const tenant = await Tenant.create({
    name: 'Default Organization',
    slug: 'default',
    dbName: makeDbName('default'),
    subscription: {
      plan: 'trial',
      status: 'trial',
      amount: 0,
      currency: 'INR',
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  const { User } = getTenantModels(tenant.dbName);
  await User.create({ username: 'admin', password: await bcrypt.hash('admin123', 10), role: 'admin' });
  console.log('Seeded: org default / admin / admin123');
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await seedIfEmpty();
    server.listen(process.env.PORT, () => console.log(`Server on port ${process.env.PORT}`));
  })
  .catch(err => console.error(err));
