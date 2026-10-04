import { PGlite } from '@electric-sql/pglite';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDatabase } from './database.js';

export async function openStore(config = {}, { migrate = true } = {}) {
  let db;
  if (config.DATABASE_URL) {
    const sequelize = createDatabase(config);
    db = {
      query: async (sql, values = []) => {
        const [rows, meta] = await sequelize.query(sql, { bind: values });
        return { rows: Array.isArray(rows) ? rows : [], affectedRows: meta?.rowCount };
      },
      exec: sql => sequelize.query(sql),
      close: () => sequelize.close(),
      kind: 'postgres',
    };
  } else {
    if (config.NODE_ENV === 'production') throw new Error('Production requires PostgreSQL.');
    const directory = config.DATA_DIR || resolve('.data/postgres');
    if (directory !== 'memory://') await mkdir(directory, { recursive: true });
    const engine = new PGlite(directory);
    await engine.waitReady;
    db = { query: (sql, values = []) => engine.query(sql, values), exec: sql => engine.exec(sql), close: () => engine.close(), kind: 'embedded-postgres' };
  }
  await db.exec('CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())');
  if (!migrate) {
    db.authenticate = () => db.query('SELECT 1');
    return db;
  }
  for (const name of ['001-core', '002-product', '003-audit-target']) {
    const existing = await db.query('SELECT name FROM app_migrations WHERE name=$1', [name]);
    if (!existing.rows.length) {
      const sql = await readFile(new URL(`../db/migrations/${name}.sql`, import.meta.url), 'utf8');
      await db.exec(`BEGIN; ${sql} INSERT INTO app_migrations(name) VALUES ('${name}'); COMMIT;`);
    }
  }
  db.authenticate = () => db.query('SELECT 1');
  return db;
}

export async function one(db, sql, values = []) { return (await db.query(sql, values)).rows[0] || null; }
export async function all(db, sql, values = []) { return (await db.query(sql, values)).rows; }

