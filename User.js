'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const PLATFORMS = ['twitch','youtube','kick','facebook'];
const ROLES     = ['user','admin','moderator'];
const PLANS     = ['none','starter','pro','elite'];

const userSchema = new mongoose.Schema({
  nickname: {
    type: String, required:[true,'Nickname obrigatório.'], unique:true,
    trim:true, minlength:[3,'Mín. 3 chars.'], maxlength:[30,'Máx. 30 chars.'],
    match:[/^[a-zA-Z0-9_]+$/,'Apenas letras, números e _.'],
  },
  email: {
    type:String, required:[true,'E-mail obrigatório.'], unique:true,
    lowercase:true, trim:true, match:[/^\S+@\S+\.\S+$/,'E-mail inválido.'],
  },
  password:  { type:String, required:[true,'Senha obrigatória.'], minlength:8, select:false },
  role:      { type:String, enum:ROLES,    default:'user' },
  isActive:  { type:Boolean, default:true },
  isEmailVerified: { type:Boolean, default:false },

  // Plataforma e canal
  platform:  { type:String, enum:PLATFORMS, required:[true,'Plataforma obrigatória.'] },
  channelUrl:{ type:String, trim:true },
  liveNick:  { type:String, trim:true },  // Nick do canal na plataforma

  // Plano ativo
  activePlan: { type:String, enum:PLANS, default:'none' },
  planExpiresAt: Date,

  // Tokens
  tokens:           { type:Number, default:0, min:0 },
  totalTokensEarned:{ type:Number, default:0 },
  totalTokensSpent: { type:Number, default:0 },

  // Estatísticas
  minutesWatched:  { type:Number, default:0 },
  viewersReceived: { type:Number, default:0 },

  // Segurança
  emailVerificationToken: { type:String, select:false },
  passwordResetToken:     { type:String, select:false },
  passwordResetExpires:   { type:Date,   select:false },
  lastLogin:   Date,
  lastLoginIp: { type:String, select:false },
  loginAttempts: { type:Number, default:0, select:false },
  lockUntil:     { type:Date,   select:false },
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals:true, transform(_doc, ret) {
    delete ret.password; delete ret.emailVerificationToken;
    delete ret.passwordResetToken; delete ret.passwordResetExpires;
    delete ret.loginAttempts; delete ret.lockUntil; delete ret.lastLoginIp;
    return ret;
  }},
});

userSchema.index({ tokens:-1 });

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

const MAX_ATTEMPTS = 5;
const LOCK_TIME    = 30 * 60 * 1000;

userSchema.methods.incrementLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set:{ loginAttempts:1 }, $unset:{ lockUntil:1 } });
  }
  const update = { $inc:{ loginAttempts:1 } };
  if (this.loginAttempts + 1 >= MAX_ATTEMPTS && !this.isLocked) {
    update.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.updateOne(update);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({ $set:{ loginAttempts:0 }, $unset:{ lockUntil:1 } });
};

module.exports = mongoose.model('User', userSchema);
