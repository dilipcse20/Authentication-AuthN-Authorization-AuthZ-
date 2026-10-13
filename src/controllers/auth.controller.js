const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');
const sessionRepository = require('../repositories/session.repository');
const { verifyRefreshToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');

/* ------------------------------- Registration ------------------------------ */

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const user = await authService.register({ name, email, password });
  res
    .status(201)
    .json(new ApiResponse(201, { user }, 'Registration successful. Please check your email to verify your account.'));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, token } = req.body;
  const user = await authService.verifyEmail({ email, token });
  res.status(200).json(new ApiResponse(200, { user }, 'Email verified successfully'));
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.resendVerificationEmail(email);
  res
    .status(200)
    .json(new ApiResponse(200, null, 'If that account exists, a verification email has been sent.'));
});

/* ---------------------------------- Login --------------------------------- */

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, tokens } = await authService.login({ email, password }, req);

  tokenService.setAuthCookies(res, tokens);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user,
        // Tokens are also returned in the body for non-browser / mobile clients.
        // Web clients should rely on the httpOnly cookies instead.
        accessToken: tokens.accessToken,
      },
      'Login successful'
    )
  );
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[env.cookies.refreshTokenName];
  if (!refreshToken) {
    throw new ApiError(401, 'No refresh token provided');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new ApiError(401, 'Refresh token invalid or expired');
  }

  const hashedIncoming = tokenService.hashRefreshToken(refreshToken);

  // Find the session whose stored hash matches the presented refresh token.
  const sessions = await sessionRepository.findActiveByUser(decoded.sub);
  const fullSessions = await Promise.all(sessions.map((s) => sessionRepository.findById(s._id)));
  const session = fullSessions.find((s) => s.refreshTokenHash === hashedIncoming);

  if (!session) {
    throw new ApiError(401, 'Session not found or has been revoked');
  }

  const user = await userRepository.findById(decoded.sub);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User no longer exists or is inactive');
  }

  const newTokens = await tokenService.rotateRefreshToken(session, user);
  tokenService.setAuthCookies(res, newTokens);

  res
    .status(200)
    .json(new ApiResponse(200, { accessToken: newTokens.accessToken }, 'Token refreshed'));
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[env.cookies.refreshTokenName];
  if (refreshToken && req.user) {
    const hashedIncoming = tokenService.hashRefreshToken(refreshToken);
    const sessions = await sessionRepository.findActiveByUser(req.user._id);
    const fullSessions = await Promise.all(sessions.map((s) => sessionRepository.findById(s._id)));
    const session = fullSessions.find((s) => s.refreshTokenHash === hashedIncoming);
    if (session) await authService.logout(session._id);
  }

  tokenService.clearAuthCookies(res);
  res.status(200).json(new ApiResponse(200, null, 'Logged out'));
});

const logoutAllDevices = asyncHandler(async (req, res) => {
  await authService.logoutAllDevices(req.user._id);
  tokenService.clearAuthCookies(res);
  res.status(200).json(new ApiResponse(200, null, 'Logged out of all devices'));
});

/* ------------------------------ Password flows ----------------------------- */

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res
    .status(200)
    .json(new ApiResponse(200, null, 'If that account exists, a password reset email has been sent.'));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, password } = req.body;
  await authService.resetPassword({ email, token, password });
  res.status(200).json(new ApiResponse(200, null, 'Password has been reset. Please log in again.'));
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user._id, { currentPassword, newPassword });
  tokenService.clearAuthCookies(res);
  res
    .status(200)
    .json(new ApiResponse(200, null, 'Password changed. Please log in again on all devices.'));
});

/* ---------------------------------- OTP ---------------------------------- */

const requestOtp = asyncHandler(async (req, res) => {
  await authService.requestOtp(req.body.email);
  res.status(200).json(new ApiResponse(200, null, 'If that account exists, an OTP has been sent.'));
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await authService.verifyOtp({ email, otp });
  res.status(200).json(new ApiResponse(200, { user }, 'OTP verified'));
});

/* -------------------------------- Sessions -------------------------------- */

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { user: authService.sanitizeUser(req.user) }));
});

const listSessions = asyncHandler(async (req, res) => {
  const sessions = await sessionRepository.findActiveByUser(req.user._id);
  res.status(200).json(new ApiResponse(200, { sessions }));
});

const revokeSession = asyncHandler(async (req, res) => {
  const session = await sessionRepository.findByIdForUser(req.params.sessionId, req.user._id);
  if (!session) throw new ApiError(404, 'Session not found');
  await sessionRepository.revokeById(session._id);
  res.status(200).json(new ApiResponse(200, null, 'Session revoked'));
});

module.exports = {
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  refresh,
  logout,
  logoutAllDevices,
  forgotPassword,
  resetPassword,
  changePassword,
  requestOtp,
  verifyOtp,
  getMe,
  listSessions,
  revokeSession,
};
