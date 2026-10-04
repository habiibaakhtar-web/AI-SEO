import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { healthRoutes } from './routes/healthRoutes.js';
import { notFound, errorMiddleware } from './middleware/errorMiddleware.js';
import cookieParser from 'cookie-parser';
import { authService } from './services/authService.js';
import { authRoutes } from './routes/authRoutes.js';
import { productRoutes } from './routes/productRoutes.js';
import { fileURLToPath } from 'node:url';
import { createMailer } from './services/mailService.js';

export function createApp({ config, database = null, audits, tools, mailer }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => { req.id = randomUUID(); res.setHeader('X-Request-Id', req.id); next(); });
  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_ORIGIN, credentials: true }));
  app.use((req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      const permitted = new Set([config.FRONTEND_ORIGIN, 'http://127.0.0.1:5173']);
      if (config.NODE_ENV === 'production') permitted.delete('http://127.0.0.1:5173');
      if (!permitted.has(req.headers.origin)) return res.status(403).json({ success:false, message:'This request origin is not allowed.' });
    }
    next();
  });
  app.use('/api', rateLimit({
    windowMs: 60000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again shortly.' },
    skip: req => req.path === '/health' || req.path === '/ready',
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api', healthRoutes({ database }));
  if (database && audits && tools) {
    const auth = authService(database, config);
    app.use('/api/auth', authRoutes(database, config, auth, mailer || createMailer(config)));
    app.use('/api', productRoutes(database, auth, audits, tools));
  }
  app.use('/api', notFound);
  if (config.NODE_ENV === 'production') {
    const assets = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
    app.use(express.static(assets));
    app.get('/{*splat}', (req, res) => res.sendFile('index.html', { root: assets }));
  }
  app.use(notFound);
  app.use(errorMiddleware);
  return app;
}

