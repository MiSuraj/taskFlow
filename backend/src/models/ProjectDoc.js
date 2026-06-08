const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
  title:   { type: String, required: true },
  content: { type: String, default: '' },
}, { _id: true });

const ProjectDocSchema = new mongoose.Schema({
  project:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  sections:     { type: [SectionSchema], default: [] },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('ProjectDoc', ProjectDocSchema);
