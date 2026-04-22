'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const PLATFORMS = ['twitch', 'youtube', 'kick', 'facebook'];
const ROLES     = ['user', 'admin', 'moderator'];

const userSchema = new mongoose.Schema(
  {
    nickname: {
      type: String,
      required: [true, 'Nickname é obrigatório.'],
      unique: true,
      trim: true,
      minlength: [3, 'Mínimo 3 caracteres'],
      maxlength: [30, 'Máximo 30 caracteres'],
      match: [/^[a-zA-Z0-9_]+$/, 'Nickname inválido'],
    },
    email: {
      type: String,
      required: [true, 'E-mail é obrigatório.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'E-mail inválido'],
    },
    password: {
      type: String,
      required: [true, 'Senha é obrigatória.'],
      minlength: 8,
      select: false,
    },
    role: { type: String, enum: ROLES, default: 'user' },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    platform: { type: String, enum: PLATFORMS, required: true },
    channelUrl: { type: String, trim: true },
    tokens: { type: Number, default: 0, min: 0 },
    totalTokensEarned: { type: Number, default: 0 },
    totalTokensSpent:  { type: Number, default: 0 },
    viewersReceived: { type: Number, default: 0 },
    hoursWatched:    { type: Number, default: 0 },
    lastLogin: Date,
    lockUntil: { type: Date, select: false },
    loginAttempts: { type: Number, default: 0, select: false }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true, transform: (doc, ret) => { delete ret.password; return ret; } }
  }
);

// ÍNDICES: Email e Nickname já são automáticos pelo "unique: true" acima.
userSchema.index({ tokens: -1 }); 

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, rounds);
    next();
  } catch (err) { next(err); }
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
