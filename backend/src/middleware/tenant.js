const Tenant = require('../models/Tenant');
const { getTenantModels } = require('../config/tenantDb');

const ACTIVE_SUBSCRIPTIONS = ['trial', 'active'];

async function loadTenantBySlug(slug) {
  if (!slug) return null;
  return Tenant.findOne({ slug: String(slug).toLowerCase().trim() });
}

async function attachTenant(req, res, next) {
  try {
    const tenantSlug = req.user?.tenantSlug || req.headers['x-tenant-slug'] || req.body?.tenantSlug;
    const tenant = await loadTenantBySlug(tenantSlug);
    if (!tenant) return res.status(404).json({ message: 'Organization not found' });
    if (tenant.status !== 'active') return res.status(403).json({ message: 'Organization is suspended' });
    if (!ACTIVE_SUBSCRIPTIONS.includes(tenant.subscription?.status)) {
      return res.status(402).json({ message: 'Subscription is not active' });
    }
    req.tenant = tenant;
    req.models = getTenantModels(tenant.dbName);
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { attachTenant, loadTenantBySlug };
