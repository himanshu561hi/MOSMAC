import mongoose from 'mongoose';
import { sendSuccess } from '../utils/responseFormatter.js';
import env from '../config/env.js';

/**
 * Liveness probe: Confirms that the Express process is active and serving requests.
 * MUST NOT depend on database or external dependencies to avoid unnecessary container restarts.
 */
export const getHealth = (req, res) => {
  return sendSuccess(res, 200, 'Server is running', {
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: '1.0.0'
  });
};

/**
 * Readiness probe: Confirms that required external dependencies (MongoDB) are healthy and ready for traffic.
 * Never leaks database URI, credentials, or internal network topology.
 */
export const getReadiness = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'DISCONNECTED',
    1: 'CONNECTED',
    2: 'CONNECTING',
    3: 'DISCONNECTING'
  };

  const isReady = dbState === 1;

  return res.status(isReady ? 200 : 503).json({
    success: isReady,
    statusCode: isReady ? 200 : 503,
    message: isReady ? 'Database is connected and ready' : 'Database connection not ready',
    data: {
      status: isReady ? 'READY' : 'NOT_READY',
      database: states[dbState] || 'UNKNOWN',
      timestamp: new Date().toISOString()
    }
  });
};

export default {
  getHealth,
  getReadiness
};


