const express = require('express');
const controller = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const checkPermission = require('../middleware/permission');
const { ROLES } = require('../constants/roles');
const { PERMISSIONS } = require('../constants/permissions');

const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  otpLimiter,
} = require('../middleware/rateLimiter');

const {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  otpRequestValidator,
  otpVerifyValidator,
} = require('../validators/auth.validator');

const router = express.Router();

/* --------------------------------- Public --------------------------------- */

router.post('/register', registerLimiter, registerValidator, controller.register);
router.post('/verify-email', verifyEmailValidator, controller.verifyEmail);
router.post('/resend-verification', resendVerificationValidator, controller.resendVerificationEmail);

router.post('/login', loginLimiter, loginValidator, controller.login);
router.post('/refresh', controller.refresh);

router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidator, controller.forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPasswordValidator, controller.resetPassword);

router.post('/otp/request', otpLimiter, otpRequestValidator, controller.requestOtp);
router.post('/otp/verify', otpLimiter, otpVerifyValidator, controller.verifyOtp);

/* ------------------------------- Authenticated ------------------------------ */

router.use(authenticate); // everything below requires a valid access token

router.get('/me', controller.getMe);
router.post('/logout', controller.logout);
router.post('/logout-all', controller.logoutAllDevices);
router.post('/change-password', changePasswordValidator, controller.changePassword);

router.get('/sessions', controller.listSessions);
router.delete('/sessions/:sessionId', controller.revokeSession);

/* ------------------------- Example RBAC-protected routes ------------------------- */

// Only ADMIN or SUPER_ADMIN may list users
router.get(
  '/admin/users',
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  checkPermission(PERMISSIONS.READ_USERS),
  (req, res) => res.json({ success: true, message: 'Admin user list placeholder' })
);

// Only users with explicit DELETE_USERS permission (or SUPER_ADMIN) may delete
router.delete(
  '/admin/users/:id',
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  checkPermission(PERMISSIONS.DELETE_USERS),
  (req, res) => res.json({ success: true, message: `User ${req.params.id} deleted (placeholder)` })
);

module.exports = router;
