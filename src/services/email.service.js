const sendVerificationEmail = require('../emails/verificationEmail');
const sendResetPasswordEmail = require('../emails/resetPasswordEmail');
const sendLoginAlertEmail = require('../emails/loginAlertEmail');
const sendOtpEmail = require('../emails/otpEmail');

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendLoginAlertEmail,
  sendOtpEmail,
};
