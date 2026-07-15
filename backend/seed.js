require('dotenv').config();
if (!globalThis.crypto) {
  globalThis.crypto = require('node:crypto').webcrypto;
}
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Tenant = require('./src/models/Tenant');
const { getTenantModels, makeDbName } = require('./src/config/tenantDb');

const OWNER = { username: 'admin', password: 'admin123', role: 'owner' };

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  let tenant = await Tenant.findOne({ slug: 'default' });
  if (!tenant) {
    tenant = await Tenant.create({
      name: 'Default Organization',
      slug: 'default',
      dbName: makeDbName('default'),
      subscription: {
        plan: 'trial',
        status: 'trial',
        amount: 0,
        currency: 'INR',
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
  }

  const { User } = getTenantModels(tenant.dbName);

  const existing = await User.findOne({ username: OWNER.username });
  if (existing) {
    // ensure role is correct if re-seeding
    if (existing.role !== 'owner') {
      await User.updateOne({ username: OWNER.username }, { $set: { role: 'owner' } });
      console.log('  ↻ Updated admin role to owner.');
    } else {
      console.log('  ✓ Owner account already exists — skipping.');
    }
    await mongoose.disconnect();
    return;
  }

  const hashed = await bcrypt.hash(OWNER.password, 10);
  await User.create({ username: OWNER.username, password: hashed, role: OWNER.role });

  console.log('\n✅ Seed complete!\n');
  console.log('Owner login:');
  console.log('  organization slug : default');
  console.log(`  username          : ${OWNER.username}`);
  console.log(`  password          : ${OWNER.password}`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
