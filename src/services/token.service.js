const crypto = require('crypto');
const env = require('../config/env');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');
const sessionRepository = require('../repositories/session.repository');

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshExpiryDate() {
  // parses e.g. "7d" / "15m" into a Date
  const match = /^(\d+)([smhd])$/.exec(env.jwt.refreshExpiresIn);
  const value = match ? parseInt(match[1], 10) : 7;
  const unit = match ? match[2] : 'd';
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
  return new Date(Date.now() + value * unitMs);
}

/**
 * Issues a new access + refresh token pair and persists the session.
 */
async function issueTokenPair(user, deviceMeta = {}) {
  const payload = { sub: user._id.toString(), role: user.role };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ sub: user._id.toString() });

  const session = await sessionRepository.create({
    userId: user._id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    device: deviceMeta.device,
    browser: deviceMeta.browser,
    os: deviceMeta.os,
    ipAddress: deviceMeta.ipAddress,
    userAgent: deviceMeta.userAgent,
    expiresAt: refreshExpiryDate(),
  });

  return { accessToken, refreshToken, sessionId: session._id };
}

/**
 * Rotates the refresh token for a given session (refresh token rotation).
 */
async function rotateRefreshToken(session, user) {
  const newRefreshToken = signRefreshToken({ sub: user._id.toString() });
  const newAccessToken = signAccessToken({ sub: user._id.toString(), role: user.role });

  session.refreshTokenHash = hashRefreshToken(newRefreshToken);
  session.expiresAt = refreshExpiryDate();
  session.lastActive = new Date();
  await session.save();

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

const cookieBaseOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'strict' : 'lax',
  domain: env.nodeEnv === 'production' ? env.cookies.domain : undefined,
  path: '/',
};

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(env.cookies.accessTokenName, accessToken, {
    ...cookieBaseOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie(env.cookies.refreshTokenName, refreshToken, {
    ...cookieBaseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth', // refresh cookie only sent to auth routes
  });
}

function clearAuthCookies(res) {
  res.clearCookie(env.cookies.accessTokenName, { ...cookieBaseOptions });
  res.clearCookie(env.cookies.refreshTokenName, { ...cookieBaseOptions, path: '/api/auth' });
}

module.exports = {
  hashRefreshToken,
  issueTokenPair,
  rotateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
};
