const UAParser = require('ua-parser-js');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { generateOtp, generateSecureToken, hashToken } = require('../utils/otp');
const { DEFAULT_PERMISSIONS_BY_ROLE } = require('../constants/permissions');
const { ROLES } = require('../constants/roles');

const userRepository = require('../repositories/user.repository');
const sessionRepository = require('../repositories/session.repository');
const emailService = require('./email.service');
const tokenService = require('./token.service');

function parseDeviceMeta(req) {
  const parser = new UAParser(req.headers['user-agent']);
  const result = parser.getResult();
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    browser: result.browser.name || 'Unknown',
    os: result.os.name || 'Unknown',
    device: result.device.type || 'desktop',
  };
}

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.otp;
  delete obj.otpExpires;
  delete obj.otpAttempts;
  return obj;
}

/* ---------------------------- Registration ---------------------------- */

async function register({ name, email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const rawToken = generateSecureToken();
  const user = await userRepository.create({
    name,
    email,
    password,
    role: ROLES.USER,
    permissions: DEFAULT_PERMISSIONS_BY_ROLE[ROLES.USER],
    emailVerificationToken: hashToken(rawToken),
    emailVerificationExpires: Date.now() + env.tokens.emailVerificationExpiresMin * 60 * 1000,
  });

  await emailService.sendVerificationEmail(user, rawToken);

  return sanitizeUser(user);
}

/* -------------------------- Email verification -------------------------- */

async function verifyEmail({ email, token }) {
  const hashed = hashToken(token);
  const user = await userRepository.findByEmailWithSecrets(email);

  if (
    !user ||
    user.emailVerificationToken !== hashed ||
    !user.emailVerificationExpires ||
    user.emailVerificationExpires < Date.now()
  ) {
    throw new ApiError(400, 'Verification link is invalid or has expired');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return sanitizeUser(user);
}

async function resendVerificationEmail(email) {
  const user = await userRepository.findByEmailWithSecrets(email);
  if (!user) {
    // Do not reveal whether the account exists.
    return;
  }
  if (user.isEmailVerified) {
    throw new ApiError(400, 'Email is already verified');
  }

  const rawToken = generateSecureToken();
  user.emailVerificationToken = hashToken(rawToken);
  user.emailVerificationExpires = Date.now() + env.tokens.emailVerificationExpiresMin * 60 * 1000;
  await user.save();

  await emailService.sendVerificationEmail(user, rawToken);
}

/* --------------------------------- Login --------------------------------- */

async function login({ email, password }, req) {
  const user = await userRepository.findByEmailWithSecrets(email);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.isLocked()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new ApiError(423, `Account locked. Try again in ${minutesLeft} minute(s).`);
  }

  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated');
  }

  const validPassword = await user.comparePassword(password);
  if (!validPassword) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= env.security.maxLoginAttempts) {
      user.lockUntil = new Date(Date.now() + env.security.lockTimeMin * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, 'Please verify your email before logging in');
  }

  // Reset failed attempts on success
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;

  const deviceMeta = parseDeviceMeta(req);
  const loginTime = new Date();

  user.lastLogin = loginTime;
  user.deviceInfo = `${deviceMeta.device} / ${deviceMeta.os} / ${deviceMeta.browser}`;
  user.ipAddress = deviceMeta.ipAddress;
  user.loginHistory.push({
    time: loginTime,
    ipAddress: deviceMeta.ipAddress,
    browser: deviceMeta.browser,
    device: deviceMeta.device,
    os: deviceMeta.os,
  });
  // keep history bounded
  if (user.loginHistory.length > 20) {
    user.loginHistory = user.loginHistory.slice(-20);
  }
  await user.save();

  const tokens = await tokenService.issueTokenPair(user, deviceMeta);

  // Fire-and-forget login alert email; do not block the response on SMTP.
  emailService
    .sendLoginAlertEmail(user, {
      time: loginTime,
      ipAddress: deviceMeta.ipAddress,
      browser: deviceMeta.browser,
      device: deviceMeta.device,
      os: deviceMeta.os,
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[email] Failed to send login alert:', err.message);
    });

  return { user: sanitizeUser(user), tokens };
}

/* --------------------------------- Logout --------------------------------- */

async function logout(sessionId) {
  if (sessionId) {
    await sessionRepository.revokeById(sessionId);
  }
}

async function logoutAllDevices(userId) {
  await sessionRepository.revokeAllForUser(userId);
}

/* ------------------------------ Password flows ------------------------------ */

async function forgotPassword(email) {
  const user = await userRepository.findByEmailWithSecrets(email);
  if (!user) return; // do not leak account existence

  const rawToken = generateSecureToken();
  user.passwordResetToken = hashToken(rawToken);
  user.passwordResetExpires = Date.now() + env.tokens.passwordResetExpiresMin * 60 * 1000;
  await user.save();

  await emailService.sendResetPasswordEmail(user, rawToken);
}

async function resetPassword({ email, token, password }) {
  const hashed = hashToken(token);
  const user = await userRepository.findByEmailWithSecrets(email);

  if (
    !user ||
    user.passwordResetToken !== hashed ||
    !user.passwordResetExpires ||
    user.passwordResetExpires < Date.now()
  ) {
    throw new ApiError(400, 'Reset link is invalid or has expired');
  }

  user.password = password; // re-hashed by pre-save hook
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Invalidate all existing sessions after a reset
  await sessionRepository.revokeAllForUser(user._id);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await userRepository.findByIdWithSecrets(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const valid = await user.comparePassword(currentPassword);
  if (!valid) throw new ApiError(401, 'Current password is incorrect');

  user.password = newPassword;
  await user.save();

  // Invalidate all other sessions for safety
  await sessionRepository.revokeAllForUser(user._id);
}

/* ---------------------------------- OTP ---------------------------------- */

async function requestOtp(email) {
  const user = await userRepository.findByEmailWithSecrets(email);
  if (!user) return; // do not leak account existence

  const otp = generateOtp();
  user.otp = hashToken(otp);
  user.otpExpires = Date.now() + env.tokens.otpExpiresMin * 60 * 1000;
  user.otpAttempts = 0;
  await user.save();

  await emailService.sendOtpEmail(user, otp);
}

async function verifyOtp({ email, otp }) {
  const user = await userRepository.findByEmailWithSecrets(email);
  if (!user || !user.otp || !user.otpExpires) {
    throw new ApiError(400, 'No OTP request found for this account');
  }

  if (user.otpExpires < Date.now()) {
    throw new ApiError(400, 'OTP has expired');
  }

  if (user.otpAttempts >= env.tokens.otpMaxAttempts) {
    throw new ApiError(429, 'Too many attempts. Please request a new OTP');
  }

  if (user.otp !== hashToken(otp)) {
    user.otpAttempts += 1;
    await user.save();
    throw new ApiError(400, 'Invalid OTP');
  }

  user.otp = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  await user.save();

  return sanitizeUser(user);
}

module.exports = {
  sanitizeUser,
  parseDeviceMeta,
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  logout,
  logoutAllDevices,
  forgotPassword,
  resetPassword,
  changePassword,
  requestOtp,
  verifyOtp,
};
