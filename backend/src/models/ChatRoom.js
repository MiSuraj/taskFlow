const mongoose = require('mongoose');

const ChatRoomSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  project:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);
