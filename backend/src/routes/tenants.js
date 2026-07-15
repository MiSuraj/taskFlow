const router = require('express').Router();
const bcrypt = require('bcryptjs');
const Tenant = require('../models/Tenant');
const PlatformVisit = require('../models/PlatformVisit');
const PlatformSettings = require('../models/PlatformSettings');
const { makeDbName, slugify, getTenantModels } = require('../config/tenantDb');
const { auth, requireRole, requireOwner } = require('../middleware/auth');

const DEFAULT_PLANS = [
  {
    key: 'basic',
    name: 'Basic',
    description: 'Core queue, boards, time logs',
    amount: 499,
    currency: 'INR',
    features: ['Task queues & boards', 'Time tracking', 'Project docs', 'Manager dashboard', 'Up to 5 users'],
    ai: false,
    externalChat: false,
    maxUsers: 5,
    badge: '',
  },
  {
    key: 'starter',
    name: 'Starter',
    description: 'Docs, chat, project management',
    amount: 999,
    currency: 'INR',
    features: ['Everything in Basic', 'Unlimited users', 'Project chat (internal)', 'AI task generation'],
    ai: true,
    externalChat: false,
    maxUsers: null,
    badge: 'Popular',
  },
  {
    key: 'business',
    name: 'Business',
    description: 'AI add-ons + external chat bridges',
    amount: 2499,
    currency: 'INR',
    features: ['Everything in Starter', 'WhatsApp / Teams / Google Chat', 'External chat bridge', 'Priority support'],
    ai: true,
    externalChat: true,
    maxUsers: null,
    badge: 'Best value',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    description: 'Custom integrations and dedicated support',
    amount: 9999,
    currency: 'INR',
    features: ['Everything in Business', 'Custom integrations', 'Dedicated support', 'SLA & invoicing'],
    ai: true,
    externalChat: true,
    maxUsers: null,
    badge: '',
    contactOnly: true,
  },
];

const PLAN_ORDER = DEFAULT_PLANS.map(plan => plan.key);

function publicPlanPayload(plan) {
  return {
    key: plan.key,
    name: plan.name,
    description: plan.description,
    amount: plan.amount,
    currency: plan.currency,
    features: plan.features || [],
    ai: plan.ai,
    externalChat: plan.externalChat,
    maxUsers: plan.maxUsers,
    badge: plan.badge,
    contactOnly: !!plan.contactOnly,
    stripeProductId: plan.stripeProductId || '',
    stripePriceId:   plan.stripePriceId   || '',
    razorpayPlanId:  plan.razorpayPlanId  || '',
  };
}

async function getPlatformSettings() {
  const settings = await PlatformSettings.findOneAndUpdate(
    { key: 'platform' },
    { $setOnInsert: { plans: DEFAULT_PLANS } },
    { new: true, upsert: true }
  );

  const existing = new Map(settings.plans.map(plan => [plan.key, plan.toObject ? plan.toObject() : plan]));
  const merged = DEFAULT_PLANS.map(plan => {
    const saved = existing.get(plan.key);
    if (!saved) return plan;
    return {
      ...plan,
      ...saved,
      description: saved.description || plan.description,
      features: saved.features?.length ? saved.features : plan.features,
    };
  });
  const needsBackfill = merged.length !== settings.plans.length
    || merged.some(plan => {
      const saved = existing.get(plan.key);
      return !saved || !saved.description || !saved.features?.length;
    });
  if (needsBackfill) {
    settings.plans = merged;
    await settings.save();
  }
  return settings;
}

async function getPlans() {
  const settings = await getPlatformSettings();
  return settings.plans
    .map(publicPlanPayload)
    .sort((a, b) => PLAN_ORDER.indexOf(a.key) - PLAN_ORDER.indexOf(b.key));
}

async function getPlan(planKey) {
  const plans = await getPlans();
  return plans.find(plan => plan.key === planKey);
}

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

router.get('/plans', async (req, res) => {
  try {
    res.json({ plans: await getPlans() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/track-visit', async (req, res) => {
  try {
    const { visitorId, path = '/' } = req.body;
    if (!visitorId) return res.status(400).json({ message: 'visitorId required' });
    await PlatformVisit.create({
      visitorId: String(visitorId).slice(0, 80),
      path: String(path).slice(0, 200),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
      ip: req.ip || '',
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/owner/stats', auth, requireOwner, async (req, res) => {
  try {
    const tenants = await Tenant.find({}).sort({ createdAt: -1 });
    const customerTenants = tenants.filter(t => t.slug !== 'default');
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalVisits,
      visitsThisMonth,
      visitsToday,
      uniqueVisitorIds,
      uniqueVisitorIdsThisMonth,
    ] = await Promise.all([
      PlatformVisit.countDocuments(),
      PlatformVisit.countDocuments({ createdAt: { $gte: monthStart } }),
      PlatformVisit.countDocuments({ createdAt: { $gte: todayStart } }),
      PlatformVisit.distinct('visitorId'),
      PlatformVisit.distinct('visitorId', { createdAt: { $gte: monthStart } }),
    ]);

    const summaries = customerTenants.map(tenant => ({
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      ownerEmail: tenant.ownerEmail,
      createdAt: tenant.createdAt,
      subscription: tenant.subscription,
    }));

    const planBreakdown = customerTenants.reduce((acc, tenant) => {
      const plan = tenant.subscription?.plan || 'unknown';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});

    const subscriptionStatus = customerTenants.reduce((acc, tenant) => {
      const status = tenant.subscription?.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const totals = customerTenants.reduce((acc, tenant) => {
      const subscriptionStatusValue = tenant.subscription?.status;
      if (tenant.status === 'active') acc.activeOrganizations += 1;
      if (tenant.status === 'suspended') acc.suspendedOrganizations += 1;
      if (subscriptionStatusValue === 'active') acc.subscribedOrganizations += 1;
      if (subscriptionStatusValue === 'trial') acc.trialOrganizations += 1;
      if (tenant.createdAt && tenant.createdAt >= monthStart) acc.joinedThisMonth += 1;
      acc.monthlyRevenue += subscriptionStatusValue === 'active' ? (tenant.subscription?.amount || 0) : 0;
      return acc;
    }, {
      organizations: customerTenants.length,
      allTenants: tenants.length,
      activeOrganizations: 0,
      suspendedOrganizations: 0,
      subscribedOrganizations: 0,
      trialOrganizations: 0,
      joinedThisMonth: 0,
      totalVisits,
      visitsThisMonth,
      visitsToday,
      uniqueVisitors: uniqueVisitorIds.length,
      uniqueVisitorsThisMonth: uniqueVisitorIdsThisMonth.length,
      monthlyRevenue: 0,
    });

    res.json({
      totals,
      plans: await getPlans(),
      planBreakdown,
      subscriptionStatus,
      recentOrganizations: summaries.slice(0, 8),
      organizations: summaries,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/owner/plans/:planKey', auth, requireOwner, async (req, res) => {
  try {
    const {
      name,
      description,
      amount,
      currency,
      features,
      ai,
      externalChat,
      maxUsers,
      badge,
      contactOnly,
    } = req.body;
    const planKey = req.params.planKey;
    if (!PLAN_ORDER.includes(planKey)) return res.status(404).json({ message: 'Plan not found' });
    if (amount !== undefined && (Number.isNaN(Number(amount)) || Number(amount) < 0)) {
      return res.status(400).json({ message: 'Amount must be a valid positive number' });
    }

    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ message: 'Plan name is required' });
    }
    if (maxUsers !== undefined && maxUsers !== null && maxUsers !== '' && Number(maxUsers) < 1) {
      return res.status(400).json({ message: 'Max users must be empty or at least 1' });
    }

    const settings = await getPlatformSettings();
    const plan = settings.plans.find(p => p.key === planKey);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    if (name !== undefined) plan.name = String(name).trim().slice(0, 80);
    if (description !== undefined) plan.description = String(description || '').trim().slice(0, 180);
    if (amount !== undefined) plan.amount = Math.round(Number(amount));
    if (currency !== undefined) plan.currency = String(currency || 'INR').toUpperCase().slice(0, 3);
    if (features !== undefined) {
      const nextFeatures = Array.isArray(features)
        ? features
        : String(features || '').split('\n');
      plan.features = nextFeatures.map(f => String(f).trim()).filter(Boolean).slice(0, 8);
    }
    if (ai !== undefined) plan.ai = !!ai;
    if (externalChat !== undefined) plan.externalChat = !!externalChat;
    if (maxUsers !== undefined) plan.maxUsers = maxUsers === null || maxUsers === '' ? null : Math.round(Number(maxUsers));
    if (badge !== undefined) plan.badge = String(badge || '').trim().slice(0, 40);
    if (contactOnly !== undefined) plan.contactOnly = !!contactOnly;
    if (req.body.stripeProductId !== undefined) plan.stripeProductId = String(req.body.stripeProductId || '').trim();
    if (req.body.stripePriceId   !== undefined) plan.stripePriceId   = String(req.body.stripePriceId   || '').trim();
    if (req.body.razorpayPlanId  !== undefined) plan.razorpayPlanId  = String(req.body.razorpayPlanId  || '').trim();
    await settings.save();

    res.json({ plans: await getPlans() });
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
    const selectedPlan = await getPlan(subscriptionPlan);
    if (!selectedPlan) return res.status(400).json({ message: 'Invalid subscription plan' });
    if (selectedPlan.contactOnly) return res.status(402).json({ message: 'This plan requires contacting sales' });
    if (!mockPayment?.paid || !mockPayment?.paymentId) {
      return res.status(402).json({ message: 'Mock payment must be completed before organization setup' });
    }

    const slug = slugify(requestedSlug || organizationName);
    if (!slug) return res.status(400).json({ message: 'Organization slug is invalid' });
    const exists = await Tenant.findOne({ slug });
    if (exists) return res.status(400).json({ message: 'Organization slug already exists' });

    // enforce plan limits on features
    const normalizedFeatures = normalizeFeatures(features);
    if (!selectedPlan.ai)   normalizedFeatures.ai.enabled = false;
    if (!selectedPlan.externalChat) normalizedFeatures.chatIntegration.enabled = false;

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
    const plan = await getPlan(req.tenant.subscription?.plan);
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
