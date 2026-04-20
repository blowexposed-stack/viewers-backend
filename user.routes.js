'use strict';

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ID externo do gateway (MP payment_id ou Stripe session_id)
    externalId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // ID do link MP para identificar o plano
    mpLinkId: {
      type: String,
      index: true,
    },

    planId: {
      type: String,
      enum: ['starter', 'pro', 'elite'],
      required: true,
    },

    amountBRL: {
      type: Number,
      required: true,
      min: 0,
    },

    tokens: {
      type: Number,
      required: true,
      min: 0,
    },

    gateway: {
      type: String,
      enum: ['mercadopago', 'stripe', 'manual'],
      default: 'mercadopago',
    },

    status: {
      type: String,
      enum: ['pending', 'completed', 'expired', 'refunded', 'rejected'],
      default: 'pending',
      index: true,
    },

    webhookPayload: {
      type: mongoose.Schema.Types.Mixed,
      select: false,
    },

    paidAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        delete ret.externalId;
        delete ret.webhookPayload;
        delete ret.mpLinkId;
        return ret;
      },
    },
  }
);

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ mpLinkId: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
