// server/scripts/configureSingleAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/watchspace_db';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const usersCol = mongoose.connection.collection('users');

    // 1. Ensure abhas5459@gmail.com is set back to viewer
    await usersCol.updateOne(
      { email: 'abhas5459@gmail.com' },
      { $set: { role: 'viewer' } }
    );
    console.log('Updated abhas5459@gmail.com role to viewer.');

    // 2. Ensure admin@watchspace.tv exists and has role admin with password adminpassword123
    const adminUser = await usersCol.findOne({ email: 'admin@watchspace.tv' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('adminpassword123', salt);

    if (adminUser) {
      await usersCol.updateOne(
        { email: 'admin@watchspace.tv' },
        { 
          $set: { 
            role: 'admin',
            password: hashedPassword
          } 
        }
      );
      console.log('Updated admin@watchspace.tv role to admin and refreshed password to adminpassword123.');
    } else {
      await usersCol.insertOne({
        name: 'System Admin',
        email: 'admin@watchspace.tv',
        password: hashedPassword,
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        stats: { watchSpaces: 0, watchTime: '0h 00m', aiQuestions: 0 },
        genres: ['Sci-Fi', 'Action', 'Drama'],
        subtitleLanguage: 'English',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created System Admin user with role admin.');
    }

    // 3. Print all users
    const allUsers = await usersCol.find({}, { projection: { name: 1, email: 1, role: 1 } }).toArray();
    console.log('\nFinal User Roles in MongoDB:');
    console.table(allUsers);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
