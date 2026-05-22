import 'reflect-metadata';
import express from 'express';
import config from '@/config';
import loaders from '@/loaders';
import Logger from '@/loaders/logger';

async function startServer() {
  const app = express();

  try {
    /**
     * Load express middlewares, jobs, database connection, etc.
     */
    await loaders({ expressApp: app });

    /**
     * Start the express server
     */
    app.listen(config.port, () => {
      // keep silent on normal startup
    });
  } catch (err) {
    Logger.error('🔥 Error starting server: %o', err);
    process.exit(1);
  }
}

startServer();
