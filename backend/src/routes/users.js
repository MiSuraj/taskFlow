const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');

// Get all users (manager sees all, others see project-scoped — handled frontend side)
router.get('/', auth, async (req, res) => {
  try {
    const { User } = req.models;
    const users = await User.find({}, 'username _id role');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
