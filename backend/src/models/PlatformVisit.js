const mongoose = require('mongoose');

const PlatformVisitSchema = new mongoose.Schema({
  visitorId: { type: String, required: true, index: true },
  path: { type: String, default: '/' },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PlatformVisit', PlatformVisitSchema);
