require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Tenant = require('./src/models/Tenant');
const { getTenantModels, makeDbName } = require('./src/config/tenantDb');

const USERS = [
  { username: 'admin',   password: 'admin123',   role: 'admin' },
  { username: 'alice',   password: 'alice123',   role: 'manager' },
  { username: 'bob',     password: 'bob123',     role: 'manager' },
  { username: 'carol',   password: 'carol123',   role: 'developer' },
  { username: 'dave',    password: 'dave123',    role: 'developer' },
  { username: 'eve',     password: 'eve123',     role: 'developer' },
  { username: 'frank',   password: 'frank123',   role: 'qa' },
  { username: 'grace',   password: 'grace123',   role: 'qa' },
];

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

  const { User, Project } = getTenantModels(tenant.dbName);

  // Only seed if no users exist in the default tenant
  const count = await User.countDocuments();
  if (count > 0) {
    console.log(`Default tenant already has ${count} users - skipping seed.`);
    await mongoose.disconnect();
    return;
  }

  const created = {};
  for (const u of USERS) {
    const hashed = await bcrypt.hash(u.password, 10);
    const user = await User.create({ username: u.username, password: hashed, role: u.role });
    created[u.username] = user;
    console.log(`  ✓ ${u.role.padEnd(10)} ${u.username} / ${u.password}`);
  }

  // Seed two projects, both owned by admin, managers assigned
  const adminUser = created['admin'];

  const p1 = await Project.create({
    name: 'Alpha Project',
    description: 'First demo project',
    createdBy: adminUser._id,
    manager: created['alice']._id,
    members: [created['carol']._id, created['dave']._id, created['frank']._id],
  });

  const p2 = await Project.create({
    name: 'Beta Project',
    description: 'Second demo project',
    createdBy: adminUser._id,
    manager: created['bob']._id,
    members: [created['eve']._id, created['grace']._id],
  });

  console.log(`\n  📁 "${p1.name}" → manager: alice`);
  console.log(`  📁 "${p2.name}" → manager: bob`);
  console.log('\n✅ Seed complete!\n');
  console.log('Default credentials:');
  console.log('  organization slug: default');
  console.log('  admin    / admin123');
  console.log('  alice    / alice123   (manager)');
  console.log('  bob      / bob123     (manager)');
  console.log('  carol    / carol123   (developer)');
  console.log('  dave     / dave123    (developer)');
  console.log('  eve      / eve123     (developer)');
  console.log('  frank    / frank123   (qa)');
  console.log('  grace    / grace123   (qa)');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
