'use strict';

const mongoose = require('mongoose');

const streamerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    isLive: { type: Boolean, default: false },
    streamTitle: {
      type: String,
      trim: true,
      maxlength: [120, 'Título muito longo.'],
    },
    game: {
      type: String,
      trim: true,
      maxlength: [60, 'Nome do jogo muito longo.'],
    },
    currentViewers: { type: Number, default: 0, min: 0 },
    peakViewers:    { type: Number, default: 0, min: 0 },
    totalHoursStreamed: { type: Number, default: 0 },
    lastWentLive: Date,
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
  }
);

streamerSchema.index({ isLive: 1, currentViewers: -1 });

module.exports = mongoose.model('Streamer', streamerSchema);
