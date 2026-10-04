import { Router } from 'express';
import { success, failure } from '../utils/apiResponse.js';

export function healthRoutes({ database }) {
  const router = Router();
  router.get('/health', (req, res) => success(res, 'API is running.', { service: 'backend', version: '0.1.0' }));
  router.get('/ready', async (req, res) => {
    if (!database) return failure(res, 'Database is not configured.', 503);
    try {
      await database.authenticate();
      // Readiness requires the core migration, not just a working TCP connection.
      await database.query('SELECT id FROM users LIMIT 0');
      return success(res, 'API and database are ready.', { database: 'ready' });
    } catch {
      return failure(res, 'Database is unavailable or migrations are pending.', 503);
    }
  });
  return router;
}

