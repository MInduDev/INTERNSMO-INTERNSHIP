// models/User.js
// User schema with password hashing
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
      type: String,
      enum: ['viewer', 'host', 'admin'],
      default: 'viewer'
    },
    avatar: {
      type: String
    },
    stats: {
      watchSpaces: { type: Number, default: 0 },
      watchTime: { type: String, default: '0h 00m' },
      aiQuestions: { type: Number, default: 0 }
    },
    genres: {
      type: [String],
      default: []
    },
    subtitleLanguage: String
  },
  {
    timestamps: true
  }
);

// Hash user password before saving into MongoDB
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
