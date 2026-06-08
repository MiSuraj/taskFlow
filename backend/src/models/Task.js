const mongoose = require('mongoose');

const TimeLogSchema = new mongoose.Schema({
  startedAt: { type: Date, required: true },
  endedAt:   { type: Date },
  duration:  { type: Number, default: 0 },
});

const CommentSchema = new mongoose.Schema({
  text:        { type: String, required: true },
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isRejection: { type: Boolean, default: false },
}, { timestamps: true });

const TaskSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  type:         { type: String, enum: ['bug', 'feature', 'enhancement'], required: true },
  status:       { type: String, enum: ['todo', 'in-progress', 'in-qa', 'done'], default: 'todo' },
  project:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  qaAssignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  queuePosition:{ type: Number, default: 0 },
  timeLogs:     [TimeLogSchema],
  totalTime:    { type: Number, default: 0 }, // persisted seconds
  comments:     [CommentSchema],
  rejectionCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
