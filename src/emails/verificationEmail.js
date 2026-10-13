const { sendMail } = require('./mailer');
const env = require('../config/env');

async function sendVerificationEmail(user, rawToken) {
  const verifyUrl = `${env.clientUrl}/verify-email?token=${rawToken}&email=${encodeURIComponent(
    user.email
  )}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2>Verify your email</h2>
      <p>Hi ${user.name},</p>
      <p>Thanks for signing up. Please verify your email address to activate your account.</p>
      <p>
        <a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">
          Verify Email
        </a>
      </p>
      <p>This link expires in ${env.tokens.emailVerificationExpiresMin} minutes.</p>
      <p>If you didn't create this account, you can safely ignore this email.</p>
    </div>
  `;

  return sendMail({ to: user.email, subject: 'Verify your email address', html });
}

module.exports = sendVerificationEmail;
