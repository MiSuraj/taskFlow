const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  plan: { type: String, enum: ['trial', 'basic', 'starter', 'business', 'enterprise'], default: 'trial' },
  status: { type: String, enum: ['trial', 'active', 'past_due', 'cancelled'], default: 'trial' },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  currentPeriodEnd: { type: Date, default: null },
}, { _id: false });

const BrandingSchema = new mongoose.Schema({
  logoUrl: { type: String, default: '' },
  primaryColor: { type: String, default: '#2563eb' },
}, { _id: false });

const AiConfigSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  provider: { type: String, enum: ['openai', 'gemini', ''], default: '' },
  model: { type: String, default: '' },
  apiKey: { type: String, default: '' },
}, { _id: false });

const ChatIntegrationSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  provider: { type: String, enum: ['whatsapp', 'google_chat', 'teams', ''], default: '' },
  whatsapp: {
    phoneNumberId: { type: String, default: '' },
    businessAccountId: { type: String, default: '' },
    accessToken: { type: String, default: '' },
    verifyToken: { type: String, default: '' },
  },
  googleChat: {
    webhookUrl: { type: String, default: '' },
  },
  teams: {
    webhookUrl: { type: String, default: '' },
  },
}, { _id: false });

const FeatureSchema = new mongoose.Schema({
  ai: { type: AiConfigSchema, default: () => ({}) },
  chatIntegration: { type: ChatIntegrationSchema, default: () => ({}) },
}, { _id: false });

const CustomRoleSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  color: { type: String, default: '#6366f1' },
  icon:  { type: String, default: '👤' },
}, { _id: false });

const TenantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  dbName: { type: String, required: true, unique: true },
  ownerEmail: { type: String, default: '', trim: true, lowercase: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  subscription: { type: SubscriptionSchema, default: () => ({}) },
  branding: { type: BrandingSchema, default: () => ({}) },
  features: { type: FeatureSchema, default: () => ({}) },
  // manager is always available; org admin can add/remove extra roles here
  customRoles: { type: [CustomRoleSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Tenant', TenantSchema);
