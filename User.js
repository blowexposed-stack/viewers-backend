'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const PLATFORMS = ['twitch', 'youtube', 'kick', 'facebook'];
const ROLES     = ['user', 'admin', 'moderator'];

const userSchema = new mongoose.Schema(
  {
    // ─── Identificação ──────────────────────────────────────────────────────
    nickname: {
      type: String,
      required: [true, 'Nickname é obrigatório.'],
      unique: true,
      trim: true,
      minlength: [3, 'Nickname deve ter no mínimo 3 caracteres.'],
      maxlength: [30, 'Nickname deve ter no máximo 30 caracteres.'],
      match: [/^[a-zA-Z0-9_]+$/, 'Nickname só pode conter letras, números e _.'],
    },

    email: {
      type: String,
      required: [true, 'E-mail é obrigatório.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'E-mail inválido.'],
    },

    // ─── Segurança ──────────────────────────────────────────────────────────
    password: {
      type: String,
      required: [true, 'Senha é obrigatória.'],
      minlength: [8, 'Senha deve ter no mínimo 8 caracteres.'],
      select: false, 
    },

    role: {
      type: String,
      enum: ROLES,
      default: 'user',
    },

    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },

    emailVerificationToken: { type: String, select: false },
    passwordResetToken:      { type: String, select: false },
    passwordResetExpires:    { type: Date,   select: false },

    // ─── Plataforma ─────────────────────────────────────────────────────────
    platform: {
      type: String,
      enum: PLATFORMS,
      required: [true, 'Plataforma é obrigatória.'],
    },

    channelUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'URL do canal inválida.'],
    },

    // ─── Tokens (sistema de pontos) ─────────────────────────────────────────
    tokens: {
      type: Number,
      default: 0,
      min: [0, 'Tokens não podem ser negativos.'],
    },

    totalTokensEarned: { type: Number, default: 0 },
    totalTokensSpent:  { type: Number, default: 0 },

    // ─── Estatísticas ────────────────────────────────────────────────────────
    viewersReceived: { type: Number, default: 0 },
    hoursWatched:    { type: Number, default: 0 },

    // ─── Auditoria ──────────────────────────────────────────────────────────
    lastLogin: Date,
    lastLoginIp: { type: String, select: false },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true, transform: sanitizeOutput },
    toObject: { virtuals: true },
  }
);

// ─── Sanitização: Remove campos sensíveis ─────────────────────────────────────
function sanitizeOutput(_doc, ret) {
  delete ret.password;
  delete ret.emailVerificationToken;
  delete ret.passwordResetToken;
  delete ret.passwordResetExpires;
  delete ret.loginAttempts;
  delete ret.lockUntil;
  delete ret.lastLoginIp;
  // O id do MongoDB já vem como virtual 'id', podemos remover o _id se quiser
  delete ret._id;
  return ret;
}

// ─── Índices ─────────────────────────────────────────────────────────────────
// NOTA: 'email' e 'nickname' já são únicos via definição do campo acima.
userSchema.index({ tokens: -1 }); // Otimiza ranking

// ─── Virtual: está bloqueado? ─────────────────────────────────────────────────
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ─── Hash da senha antes de salvar ───────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    // Garante que 'rounds' seja um número válido para não crashar o Bcrypt
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Métodos de Instância ─────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 min

userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }

  const update = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    update.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.updateOne(update);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
};

module.exports = mongoose.model('User', userSchema);
