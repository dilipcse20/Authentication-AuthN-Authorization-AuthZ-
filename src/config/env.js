require('dotenv').config();

const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.warn(`[env] Warning: missing required env var ${key}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  mongoUri: process.env.MONGO_URI,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cookies: {
    domain: process.env.COOKIE_DOMAIN || 'localhost',
    accessTokenName: process.env.ACCESS_TOKEN_COOKIE || 'accessToken',
    refreshTokenName: process.env.REFRESH_TOKEN_COOKIE || 'refreshToken',
  },

  tokens: {
    emailVerificationExpiresMin: parseInt(process.env.EMAIL_VERIFICATION_EXPIRES_MIN, 10) || 60,
    passwordResetExpiresMin: parseInt(process.env.PASSWORD_RESET_EXPIRES_MIN, 10) || 30,
    otpExpiresMin: parseInt(process.env.OTP_EXPIRES_MIN, 10) || 5,
    otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5,
  },

  security: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
    lockTimeMin: parseInt(process.env.LOCK_TIME_MIN, 10) || 30,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'Auth Service <no-reply@example.com>',
  },
};
