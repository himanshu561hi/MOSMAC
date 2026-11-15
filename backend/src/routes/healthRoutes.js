import { Router } from 'express';
import { getHealth, getReadiness } from '../controllers/healthController.js';

export const healthRoutes = Router();

// Liveness probe endpoints (no database dependency)
healthRoutes.get('/', getHealth);
healthRoutes.get('/live', getHealth);
healthRoutes.get('/liveness', getHealth);

// Readiness probe endpoints (verifies database dependency)
healthRoutes.get('/ready', getReadiness);
healthRoutes.get('/readiness', getReadiness);

export default healthRoutes;

