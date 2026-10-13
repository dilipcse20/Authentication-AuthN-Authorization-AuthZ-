const crypto = require('crypto');

/** Generates a 6-digit numeric OTP as a string. */
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/** Generates a secure URL-safe random token (for email verification / password reset). */
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Hashes a token/OTP before storing it in the DB so raw values are never persisted. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { generateOtp, generateSecureToken, hashToken };
