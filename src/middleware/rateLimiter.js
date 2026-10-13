const rateLimit = require('express-rate-limit');

const makeLimiter = (windowMinutes, max, message) =>

    rateLimit({

        windowMs: windowMinutes * 60 * 1000,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message },

    });

module.exports = {

    loginAttempts: makeLimiter(15, 10, 'Too Many Login Attempts, Try Again'),
    registerLimiter: makeLimiter(60, 10, 'Too Many Register Attempts, Try Again'),
    forgotPasswordLimiter: makeLimiter(15, 5, 'Too many password reset requests. Please try again later.'),
    resetPasswordLimiter: makeLimiter(15, 10, 'Too many ResetPassword requests, Try Again'),
    otpLimiter: makeLimiter(10, 5, 'Too Many OTP Requests. Please Try Again Later')

}