import app from './app.js';
import env from './config/env.js';
import { connectDB, disconnectDB } from './config/database.js';
import { syncSuperAdminFromEnv } from './services/adminSyncService.js';

const PORT = env.PORT || 5000;
const HOST = env.HOST || '127.0.0.1';

async function startServer() {
  try {
    // Attempt database connection
    try {
      await connectDB();
      await syncSuperAdminFromEnv();
    } catch (dbError) {
      console.warn('⚠️ Server started without immediate DB connection:', dbError.message);
    }

    const server = app.listen(PORT, HOST, () => {
      console.log(`🚀 API Server running in [${env.NODE_ENV}] mode on http://${HOST}:${PORT}`);
      console.log(`📡 Health endpoint: http://${HOST}:${PORT}/api/v1/health`);
    });

    // Graceful shutdown handlers
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          await disconnectDB();
        } catch (err) {
          console.error('Error during DB disconnect:', err.message);
        }
        process.exit(0);
      });

      // Force shutdown if taking longer than 10 seconds
      setTimeout(() => {
        console.error('Forcefully terminating process after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Fatal server boot error:', err);
    process.exit(1);
  }
}

startServer();

