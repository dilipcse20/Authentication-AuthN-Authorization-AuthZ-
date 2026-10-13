const { sendMail } = require('./mailer');
const env = require('../config/env');

async function sendOtpEmail(user, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2>Your verification code</h2>
      <p>Hi ${user.name},</p>
      <p>Use the code below to continue. It expires in ${env.tokens.otpExpiresMin} minutes.</p>
      <p style="font-size:28px; letter-spacing:6px; font-weight:bold;">${otp}</p>
      <p>If you didn't request this code, you can safely ignore this email.</p>
    </div>
  `;

  return sendMail({ to: user.email, subject: 'Your verification code', html });
}

module.exports = sendOtpEmail;
