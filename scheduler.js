'use strict';

const User     = require('../models/User');
const AppError = require('../utils/AppError');

// ─── GET /ranking ─────────────────────────────────────────────────────────────
async function getRanking(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ isActive: true })
        .select('nickname platform tokens viewersReceived hoursWatched')
        .sort({ tokens: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ isActive: true }),
    ]);

    const ranked = users.map((u, i) => ({
      position: skip + i + 1,
      nickname: u.nickname,
      platform: u.platform,
      tokens: u.tokens,
      viewersReceived: u.viewersReceived,
    }));

    return res.json({
      success: true,
      data: ranked,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getRanking };
