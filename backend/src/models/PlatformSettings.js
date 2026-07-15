const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  key: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  features: { type: [String], default: [] },
  ai: { type: Boolean, default: false },
  externalChat: { type: Boolean, default: false },
  maxUsers: { type: Number, default: null },
  badge: { type: String, default: '' },
  contactOnly: { type: Boolean, default: false },
  // payment gateway integration fields
  stripeProductId: { type: String, default: '' },
  stripePriceId:   { type: String, default: '' },
  razorpayPlanId:  { type: String, default: '' },
}, { _id: false });

const PlatformSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'platform', unique: true },
  plans: { type: [PlanSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('PlatformSettings', PlatformSettingsSchema);
