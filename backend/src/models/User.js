const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  // role is open string — 'admin' and 'manager' are reserved; org admins can define custom roles
  role: { type: String, default: 'member' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
