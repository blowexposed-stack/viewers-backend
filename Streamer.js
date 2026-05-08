'use strict';
const mongoose = require('mongoose');

const streamerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true, index:true },
  platform:     { type:String, enum:['twitch','youtube','kick','facebook'], default:'twitch', index:true },
  liveNick:     { type:String, trim:true, maxlength:60 },
  channelUrl:   { type:String, trim:true },
  isLive:       { type:Boolean, default:false },
  streamTitle:  { type:String, trim:true, maxlength:120 },
  game:         { type:String, trim:true, maxlength:60 },
  currentViewers:    { type:Number, default:0, min:0 },
  peakViewers:       { type:Number, default:0, min:0 },
  totalViewers:      { type:Number, default:0, min:0 },
  todayViewers:      { type:Number, default:0, min:0 },
  monthViewers:      { type:Number, default:0, min:0 },
  totalHoursStreamed:{ type:Number, default:0 },
  planPriority:      { type:Number, default:1 },  // 1=free, 2=starter, 3=pro, 4=elite
  lastWentLive: Date,
  lastDrainAt:  Date,
}, { timestamps:true, versionKey:false, toJSON: { virtuals:true } });

streamerSchema.index({ isLive:1, planPriority:-1, currentViewers:-1 });
streamerSchema.index({ user:1, platform:1, liveNick:1 }, { unique:true });
module.exports = mongoose.model('Streamer', streamerSchema);
