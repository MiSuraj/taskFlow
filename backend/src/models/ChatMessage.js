const mongoose = require('mongoose');

const ReactionSchema = new mongoose.Schema({
  emoji:  { type: String, required: true },
  users:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const ChatMessageSchema = new mongoose.Schema({
  room:     { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  sender:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:     { type: String, required: true },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [ReactionSchema],
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
