'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PLATFORMS = ['twitch', 'youtube', 'kick', 'facebook'];
const ROLES = ['user', 'admin', 'moderator'];
const PLANS = ['none', 'starter', 'pro', 'elite'];

const userSchema = new mongoose.Schema({
  nickname: {
    type: String, required: [true, 'Nickname obrigatório.'], unique: true,
    trim: true, minlength: 3, maxlength: 30, index: true,
    match: [/^[a-zA-Z0-9_]+$/, 'Apenas letras, números e _.']
  },
  email: {
    type: String, required: [true, 'E-mail obrigatório.'], unique: true,
    lowercase: true, trim: true, index: true, match: [/^\S+@\S+\.\S+$/, 'E-mail inválido.']
  },
  password: { type: String, required: [true, 'Senha obrigatória.'], minlength: 8, select: false },
  role: { type: String, enum: ROLES, default: 'user', index: true },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  platform: { type: String, enum: PLATFORMS, required: [true, 'Plataforma obrigatória.'] },
  channelUrl: { type: String, trim: true },
  liveNick: { type: String, trim: true },
  activePlan: { type: String, enum: PLANS, default: 'none', index: true },
  planExpiresAt: { type: Date, index: true },
  tokens: { type: Number, default: 0, min: 0, index: -1 },
  totalTokensEarned: { type: Number, default: 0, min: 0 },
  totalTokensSpent: { type: Number, default: 0, min: 0 },
  minutesWatched: { type: Number, default: 0, min: 0 },
  viewersReceived: { type: Number, default: 0, min: 0 },
  emailVerificationToken: { type: String, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  lastLogin: Date,
  lastLoginIp: { type: String, select: false },
  loginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, select: false },
}, {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(_doc, ret) {
      delete ret.password;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  }
});

userSchema.index({ activePlan: 1, tokens: -1 });

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000;

userSchema.methods.incrementLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if ((this.loginAttempts || 0) + 1 >= MAX_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
};

// Evita o erro "OverwriteModelError" se o Railway der hot-reload
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
