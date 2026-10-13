const User = require('../models/User');

const withSecretFields = '+password +emailVerificationToken +emailVerificationExpires ' +
  '+passwordResetToken +passwordResetExpires +otp +otpExpires +otpAttempts';

module.exports = {
  create: (data) => User.create(data),

  findByEmail: (email) => User.findOne({ email: email.toLowerCase() }),

  findByEmailWithSecrets: (email) =>
    User.findOne({ email: email.toLowerCase() }).select(withSecretFields),

  findById: (id) => User.findById(id),

  findByIdWithSecrets: (id) => User.findById(id).select(withSecretFields),

  findByVerificationToken: (hashedToken) =>
    User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select(withSecretFields),

  findByResetToken: (hashedToken) =>
    User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select(withSecretFields),

  save: (userDoc) => userDoc.save(),

  updateById: (id, update) => User.findByIdAndUpdate(id, update, { new: true }),
};
