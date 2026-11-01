// server/scripts/updateAdminRole.js
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/watchspace_db';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const usersCol = mongoose.connection.collection('users');
    const allUsers = await usersCol.find({}, { projection: { name: 1, email: 1, role: 1 } }).toArray();
    console.log('Current Users in DB:');
    console.table(allUsers);

    // Promote abhas5459@gmail.com to admin
    const res = await usersCol.updateOne(
      { email: 'abhas5459@gmail.com' },
      { $set: { role: 'admin' } }
    );
    console.log('Update result for abhas5459@gmail.com:', res);

    // Verify
    const updatedUsers = await usersCol.find({}, { projection: { name: 1, email: 1, role: 1 } }).toArray();
    console.log('Updated Users:');
    console.table(updatedUsers);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
