const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');

async function start() {

  await connectDB();

  const server = app.listen(env.port, () => {

    // eslint-disable-next-line no-console
    console.log(`[server] Listening on port ${env.port} (${env.nodeEnv})`);

  });

  process.on('unhandledRejection', (err) => {

    // eslint-disable-next-line no-console
    console.error('[unhandledRejection]', err);
    server.close(() => process.exit(1));

  });
}

start();