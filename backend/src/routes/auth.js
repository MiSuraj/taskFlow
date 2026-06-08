const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth, requireRole } = require('../middleware/auth');
const { loadTenantBySlug } = require('../middleware/tenant');
const { getTenantModels } = require('../config/tenantDb');

const makeToken = (user) =>
  jwt.sign({
    id: user._id,
    username: user.username,
    role: user.role,
    tenantId: user.tenant._id,
    tenantSlug: user.tenant.slug,
    dbName: user.tenant.dbName,
  }, process.env.JWT_SECRET, { expiresIn: '7d' });

const userPayload = (user) => ({
  id: user._id,
  username: user.username,
  role: user.role,
  tenant: {
    id: user.tenant._id,
    name: user.tenant.name,
    slug: user.tenant.slug,
    subscription: user.tenant.subscription,
    branding: user.tenant.branding,
    customRoles: user.tenant.customRoles || [],
  },
});

// Public login only — all users are seeded or invited
router.post('/login', async (req, res) => {
  try {
    const { username, password, tenantSlug } = req.body;
    if (!tenantSlug) return res.status(400).json({ message: 'Organization slug required' });
    const tenant = await loadTenantBySlug(tenantSlug);
    if (!tenant) return res.status(404).json({ message: 'Organization not found' });
    if (tenant.status !== 'active') return res.status(403).json({ message: 'Organization is suspended' });
    if (!['trial', 'active'].includes(tenant.subscription?.status)) {
      return res.status(402).json({ message: 'Subscription is not active' });
    }
    const { User } = getTenantModels(tenant.dbName);
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: 'Invalid credentials' });
    user.tenant = tenant;
    res.json({ token: makeToken(user), user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin creates any user (manager/developer/qa)
router.post('/create-user', auth, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const { User } = req.models;
    if (!username || !password || !role) return res.status(400).json({ message: 'username, password and role required' });
    if (!['manager', 'developer', 'qa'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: 'Username already taken' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed, role });
    user.tenant = req.tenant;
    res.status(201).json({ user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager invites developer/qa into their project scope
router.post('/invite', auth, requireRole('manager'), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const { User } = req.models;
    if (!username || !password || !role) return res.status(400).json({ message: 'username, password and role required' });
    if (role === 'admin' || role === 'manager') return res.status(400).json({ message: 'Invalid role for invite' });
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: 'Username already taken' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed, role });
    user.tenant = req.tenant;
    res.status(201).json({ user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
