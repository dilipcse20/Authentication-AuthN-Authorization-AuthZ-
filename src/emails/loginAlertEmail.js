const { sendMail } = require('./mailer');

/**
 * Sends the "New Login Detected" notification after every successful login.
 * @param {object} user - Mongoose user document
 * @param {object} meta - { time, ipAddress, browser, device, os }
 */
async function sendLoginAlertEmail(user, meta) {
  const { time, ipAddress, browser, device, os } = meta;
  const formattedTime = new Date(time).toUTCString();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2>New Login Detected</h2>
      <p>Hi ${user.name},</p>
      <p>Your account was successfully accessed.</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding:4px 0; color:#666;">Time</td><td style="padding:4px 0;">${formattedTime}</td></tr>
        <tr><td style="padding:4px 0; color:#666;">IP Address</td><td style="padding:4px 0;">${ipAddress || 'Unknown'}</td></tr>
        <tr><td style="padding:4px 0; color:#666;">Browser</td><td style="padding:4px 0;">${browser || 'Unknown'}</td></tr>
        <tr><td style="padding:4px 0; color:#666;">Device</td><td style="padding:4px 0;">${device || 'Unknown'}</td></tr>
        <tr><td style="padding:4px 0; color:#666;">Operating System</td><td style="padding:4px 0;">${os || 'Unknown'}</td></tr>
      </table>
      <p style="color:#b91c1c;"><strong>If this wasn't you, reset your password immediately.</strong></p>
    </div>
  `;

  return sendMail({ to: user.email, subject: 'New Login Detected', html });
}

module.exports = sendLoginAlertEmail;
