const Session = require('../models/Session');

module.exports = {
  create: (data) => Session.create(data),

  findActiveByUser: (userId) =>
    Session.find({ userId, isRevoked: false, expiresAt: { $gt: new Date() } }).sort({
      lastActive: -1,
    }),

  findById: (id) => Session.findById(id).select('+refreshTokenHash'),

  findByIdForUser: (id, userId) =>
    Session.findOne({ _id: id, userId }).select('+refreshTokenHash'),

  revokeById: (id) => Session.findByIdAndUpdate(id, { isRevoked: true }, { new: true }),

  revokeAllForUser: (userId) =>
    Session.updateMany({ userId, isRevoked: false }, { isRevoked: true }),

  touchLastActive: (id) => Session.findByIdAndUpdate(id, { lastActive: new Date() }),
};
