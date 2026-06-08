const router      = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');

const populateRoom = (q) => q.populate('members', 'username role').populate('createdBy', 'username');
const populateMsg  = (q) => q.populate('sender', 'username role').populate('mentions', 'username');

// ── Rooms ──

// Get all rooms for a project (member or manager or admin)
router.get('/rooms/:projectId', auth, async (req, res) => {
  try {
    const { ChatRoom } = req.models;
    const rooms = await populateRoom(ChatRoom.find({ project: req.params.projectId }));
    res.json(rooms);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Create room — manager or admin
router.post('/rooms', auth, requireRole('manager'), async (req, res) => {
  try {
    const { ChatRoom } = req.models;
    const { name, projectId, memberIds = [] } = req.body;
    if (!name || !projectId) return res.status(400).json({ message: 'name and projectId required' });
    const room = await ChatRoom.create({
      name, project: projectId, createdBy: req.user.id,
      members: [...new Set([req.user.id, ...memberIds])],
    });
    res.status(201).json(await populateRoom(ChatRoom.findById(room._id)));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Add member to room — manager or admin
router.patch('/rooms/:id/members', auth, requireRole('manager'), async (req, res) => {
  try {
    const { ChatRoom } = req.models;
    const { userId } = req.body;
    const room = await ChatRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (!room.members.map(m => m.toString()).includes(userId)) room.members.push(userId);
    await room.save();
    res.json(await populateRoom(ChatRoom.findById(room._id)));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Remove member from room — manager or admin
router.delete('/rooms/:id/members/:userId', auth, requireRole('manager'), async (req, res) => {
  try {
    const { ChatRoom } = req.models;
    const room = await ChatRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    room.members = room.members.filter(m => m.toString() !== req.params.userId);
    await room.save();
    res.json(await populateRoom(ChatRoom.findById(room._id)));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete room — manager or admin
router.delete('/rooms/:id', auth, requireRole('manager'), async (req, res) => {
  try {
    const { ChatRoom, ChatMessage } = req.models;
    await ChatRoom.findByIdAndDelete(req.params.id);
    await ChatMessage.deleteMany({ room: req.params.id });
    res.json({ message: 'Room deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Messages ──

// Get messages for a room (paginated, latest 50)
router.get('/messages/:roomId', auth, async (req, res) => {
  try {
    const { ChatMessage } = req.models;
    const msgs = await populateMsg(
      ChatMessage.find({ room: req.params.roomId }).sort({ createdAt: -1 }).limit(50)
    );
    res.json(msgs.reverse());
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Toggle reaction on a message
router.patch('/messages/:id/react', auth, async (req, res) => {
  try {
    const { ChatMessage } = req.models;
    const { emoji } = req.body;
    const msg = await ChatMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    const existing = msg.reactions.find(r => r.emoji === emoji);
    if (existing) {
      const idx = existing.users.map(u => u.toString()).indexOf(req.user.id);
      if (idx >= 0) existing.users.splice(idx, 1);
      else existing.users.push(req.user.id);
      if (existing.users.length === 0) msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
    } else {
      msg.reactions.push({ emoji, users: [req.user.id] });
    }
    await msg.save();
    res.json(await populateMsg(ChatMessage.findById(msg._id)));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
