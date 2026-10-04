import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  HOST: z.string().default('127.0.0.1'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().default(''),
  DATABASE_SSL: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  JWT_SECRET: z.string().default(''),
  AGENT_URL: z.string().url().default('http://127.0.0.1:8000'),
  AGENT_SERVICE_TOKEN: z.string().default(''),
  DATA_DIR: z.string().default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  MAIL_FROM: z.string().default(''),
});

export function parseEnvironment(source = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map(issue => issue.path.join('.')))];
    throw new Error(`Invalid environment configuration: ${fields.join(', ')}`);
  }
  const config = result.data;
  if(config.SMTP_HOST && (!config.SMTP_USER || !config.SMTP_PASSWORD || !config.MAIL_FROM))throw new Error('SMTP_HOST requires SMTP_USER, SMTP_PASSWORD and MAIL_FROM');
  if (config.DATABASE_URL) {
    let url;
    try { url = new URL(config.DATABASE_URL); } catch { throw new Error('DATABASE_URL must be a PostgreSQL URL'); }
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must be a PostgreSQL URL');
  }
  if (config.NODE_ENV === 'production' && (!config.DATABASE_URL || config.JWT_SECRET.length < 32)) {
    throw new Error('Production requires DATABASE_URL and JWT_SECRET of at least 32 characters');
  }
  return Object.freeze(config);
}

