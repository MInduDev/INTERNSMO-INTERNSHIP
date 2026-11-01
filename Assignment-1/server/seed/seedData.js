// seed/seedData.js
// Populate MongoDB with sample data
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
function requireDemoPasswords() {

  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  if (

    typeof adminPassword !== 'string' ||
    adminPassword.length < 12

  ) {
    throw new Error(
      'Set different DEMO_ADMIN_PASSWORD values (at least 12 characters each) in server/.env before seeding.'
    );
  }
  return {adminPassword };
}

const seedDatabase = async () => {
  try {
    const {adminPassword } = requireDemoPasswords();
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/watchspace_db';
    console.log('[Seed] Connecting to configured MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to database.');

    // 1. Clear existing collections for a fresh start
    await User.deleteMany({});

    console.log('[Seed] Cleared existing data.');


    // 2. Create Users (Default User & Admin)

    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@watchspace.tv',
      password: adminPassword,
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
    });

    console.log(`[Seed] Created ${2} users ( Admin).`);

    console.log('----------------------------------------------------');
    console.log('✅ DATABASE SEED COMPLETED SUCCESSFULLY!');
    console.log('Demo accounts created:admin@watchspace.tv');
    console.log('Use the private DEMO_ADMIN_PASSWORD values configured in server/.env.');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
};

seedDatabase();
