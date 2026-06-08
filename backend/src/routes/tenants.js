const router = require('express').Router();
const bcrypt = require('bcryptjs');
const Tenant = require('../models/Tenant');
const { makeDbName, slugify, getTenantModels } = require('../config/tenantDb');
const { auth, requireRole } = require('../middleware/auth');

const PLANS = {
  basic:      { amount: 499,  currency: 'INR', ai: false, externalChat: false, maxUsers: 5 },
  starter:    { amount: 999,  currency: 'INR', ai: true,  externalChat: false, maxUsers: Infinity },
  business:   { amount: 2499, currency: 'INR', ai: true,  externalChat: true,  maxUsers: Infinity },
  enterprise: { amount: 9999, currency: 'INR', ai: true,  externalChat: true,  maxUsers: Infinity },
};

function tenantPayload(tenant) {
  return {
    id: tenant._id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    subscription: tenant.subscription,
    branding: tenant.branding,
    features: tenant.features,
    customRoles: tenant.customRoles || [],
  };
}

function normalizeFeatures(features = {}) {
  const aiEnabled = !!features.ai?.enabled;
  const chatEnabled = !!features.chatIntegration?.enabled;
  const chatProvider = chatEnabled ? features.chatIntegration?.provider : '';

  return {
    ai: {
      enabled: aiEnabled,
      provider: aiEnabled ? (features.ai.provider || '') : '',
      model: aiEnabled ? (features.ai.model || '') : '',
      apiKey: aiEnabled ? (features.ai.apiKey || '') : '',
    },
    chatIntegration: {
      enabled: chatEnabled,
      provider: chatProvider || '',
      whatsapp: chatProvider === 'whatsapp' ? {
        phoneNumberId: features.chatIntegration?.whatsapp?.phoneNumberId || '',
        businessAccountId: features.chatIntegration?.whatsapp?.businessAccountId || '',
        accessToken: features.chatIntegration?.whatsapp?.accessToken || '',
        verifyToken: features.chatIntegration?.whatsapp?.verifyToken || '',
      } : {},
      googleChat: chatProvider === 'google_chat' ? {
        webhookUrl: features.chatIntegration?.googleChat?.webhookUrl || '',
      } : {},
      teams: chatProvider === 'teams' ? {
        webhookUrl: features.chatIntegration?.teams?.webhookUrl || '',
      } : {},
    },
  };
}

router.get('/public/:slug', async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ slug: req.params.slug.toLowerCase() });
    if (!tenant) return res.status(404).json({ message: 'Organization not found' });
    res.json({ tenant: tenantPayload(tenant) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const {
      organizationName,
      slug: requestedSlug,
      ownerEmail,
      username,
      password,
      logoUrl,
      primaryColor,
      subscriptionPlan = 'basic',
      mockPayment,
      features,
      customRoles = [],
    } = req.body;

    if (!organizationName || !username || !password) {
      return res.status(400).json({ message: 'organizationName, username and password are required' });
    }
    if (!PLANS[subscriptionPlan]) return res.status(400).json({ message: 'Invalid subscription plan' });
    if (!mockPayment?.paid || !mockPayment?.paymentId) {
      return res.status(402).json({ message: 'Mock payment must be completed before organization setup' });
    }

    const slug = slugify(requestedSlug || organizationName);
    if (!slug) return res.status(400).json({ message: 'Organization slug is invalid' });
    const exists = await Tenant.findOne({ slug });
    if (exists) return res.status(400).json({ message: 'Organization slug already exists' });

    const selectedPlan = PLANS[subscriptionPlan];

    // enforce plan limits on features
    const normalizedFeatures = normalizeFeatures(features);
    if (!selectedPlan.ai)   normalizedFeatures.ai.enabled = false;
    if (!selectedPlan.chat) normalizedFeatures.chatIntegration.enabled = false;

    const tenant = await Tenant.create({
      name: organizationName,
      slug,
      dbName: makeDbName(slug),
      ownerEmail,
      branding: { logoUrl, primaryColor },
      features: normalizedFeatures,
      customRoles: (customRoles || []).filter(r =>
        r.name && r.name.toLowerCase() !== 'admin' && r.name.toLowerCase() !== 'manager'
      ),
      subscription: {
        plan: subscriptionPlan,
        status: 'active',
        amount: selectedPlan.amount,
        currency: selectedPlan.currency,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const models = getTenantModels(tenant.dbName);
    const hashed = await bcrypt.hash(password, 10);
    await models.User.create({ username, password: hashed, role: 'admin' });

    res.status(201).json({ tenant: tenantPayload(tenant) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  res.json({ tenant: tenantPayload(req.tenant) });
});

router.patch('/branding', auth, requireRole('admin'), async (req, res) => {
  try {
    const { logoUrl, primaryColor } = req.body;
    if (logoUrl !== undefined) req.tenant.branding.logoUrl = logoUrl;
    if (primaryColor !== undefined) req.tenant.branding.primaryColor = primaryColor;
    await req.tenant.save();
    res.json({ tenant: tenantPayload(req.tenant) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update features (AI / chat) — enforces plan limits
router.patch('/features', auth, requireRole('admin'), async (req, res) => {
  try {
    const plan = PLANS[req.tenant.subscription?.plan];
    if (!plan) return res.status(400).json({ message: 'Invalid plan on tenant' });
    const { features } = req.body;
    const normalized = normalizeFeatures(features);
    if (!plan.ai && normalized.ai.enabled)
      return res.status(403).json({ message: 'AI task generation requires the Starter plan or above.' });
    if (!plan.externalChat && normalized.chatIntegration.enabled)
      return res.status(403).json({ message: 'External chat (WhatsApp / Teams / Google Chat) requires the Business plan.' });
    req.tenant.features = normalized;
    await req.tenant.save();
    res.json({ tenant: tenantPayload(req.tenant) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/subscription', auth, requireRole('admin'), async (req, res) => {
  try {
    const { plan, status, amount, currency, currentPeriodEnd } = req.body;
    if (plan !== undefined) req.tenant.subscription.plan = plan;
    if (status !== undefined) req.tenant.subscription.status = status;
    if (amount !== undefined) req.tenant.subscription.amount = amount;
    if (currency !== undefined) req.tenant.subscription.currency = currency;
    if (currentPeriodEnd !== undefined) req.tenant.subscription.currentPeriodEnd = currentPeriodEnd;
    await req.tenant.save();
    res.json({ tenant: tenantPayload(req.tenant) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Custom Roles ──

// GET all custom roles for the tenant
router.get('/roles', auth, async (req, res) => {
  res.json({ customRoles: req.tenant.customRoles || [] });
});

// POST add a new custom role
router.post('/roles', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Role name is required' });
    const slug = name.trim().toLowerCase();
    if (slug === 'admin' || slug === 'manager')
      return res.status(400).json({ message: '"admin" and "manager" are reserved roles' });
    if (req.tenant.customRoles.some(r => r.name.toLowerCase() === slug))
      return res.status(400).json({ message: 'Role already exists' });
    req.tenant.customRoles.push({ name: name.trim(), color: color || '#6366f1', icon: icon || '👤' });
    await req.tenant.save();
    res.json({ tenant: tenantPayload(req.tenant) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE remove a custom role by name
router.delete('/roles/:name', auth, requireRole('admin'), async (req, res) => {
  try {
    req.tenant.customRoles = req.tenant.customRoles.filter(
      r => r.name.toLowerCase() !== req.params.name.toLowerCase()
    );
    await req.tenant.save();
    res.json({ tenant: tenantPayload(req.tenant) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
