const { sendMail } = require('./mailer');
const env = require('../config/env');

async function sendResetPasswordEmail(user, rawToken) {
  const resetUrl = `${env.clientUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(
    user.email
  )}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2>Reset your password</h2>
      <p>Hi ${user.name},</p>
      <p>We received a request to reset your password. Click below to choose a new one.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">
          Reset Password
        </a>
      </p>
      <p>This link expires in ${env.tokens.passwordResetExpiresMin} minutes.</p>
      <p>If you didn't request this, you can safely ignore this email — your password will not change.</p>
    </div>
  `;

  return sendMail({ to: user.email, subject: 'Reset your password', html });
}

module.exports = sendResetPasswordEmail;
