const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const env = require('../config/env');

function applySecurity(app) {
  app.use(helmet());
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true, // required so cookies are sent cross-origin
    })
  );
  app.use(mongoSanitize()); // strips $ and . from req.body/query/params
  app.use(xssClean()); // sanitizes user input from malicious HTML/JS
  app.use(hpp()); // prevents HTTP parameter pollution
}

module.exports = applySecurity;
