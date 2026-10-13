const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const applySecurity = require('./middleware/security');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const env = require('./config/env');

const app = express();

// Needed so `req.ip` / rate-limiting reflect the real client when behind a
// reverse proxy (e.g. Nginx, Render, Heroku).
app.set('trust proxy', 1);

applySecurity(app);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.get('/health', (_req, res) => res.json({ status: 'ok', env: env.nodeEnv }));

app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;