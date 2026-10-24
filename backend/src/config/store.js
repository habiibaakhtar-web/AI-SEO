import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { openMysqlStore } from "./mysqlStore.js";

export async function openStore(config = {}, { migrate = true } = {}) {
  if (config.DB_NAME) return openMysqlStore(config, { migrate });
  if (config.NODE_ENV === "production")
    throw new Error("Production requires MySQL configuration.");
  let db;
  if (config.DATABASE_URL) {
    const { createDatabase } = await import("./database.js");
    const sequelize = createDatabase(config);
    async function query(sql, values = [], transaction) {
      const [rows, meta] = await sequelize.query(sql, {
        bind: values,
        transaction,
      });
      return {
        rows: Array.isArray(rows) ? rows : [],
        affectedRows: meta?.rowCount,
      };
    }
    db = {
      query,
      transaction: (callback) =>
        sequelize.transaction((tx) =>
          callback({ query: (sql, values = []) => query(sql, values, tx) }),
        ),
      exec: (sql) => sequelize.query(sql),
      close: () => sequelize.close(),
      kind: "postgres",
    };
  } else {
    const directory = config.DATA_DIR || resolve(".data/postgres");
    if (directory !== "memory://") await mkdir(directory, { recursive: true });
    const { PGlite } = await import("@electric-sql/pglite");
    const engine = new PGlite(directory);
    await engine.waitReady;
    db = {
      query: (sql, values = []) => engine.query(sql, values),
      exec: (sql) => engine.exec(sql),
      close: () => engine.close(),
      transaction: (callback) =>
        engine.transaction((tx) =>
          callback({ query: (sql, values = []) => tx.query(sql, values) }),
        ),
      kind: "embedded-postgres",
    };
  }
  await db.exec(
    "CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())",
  );
  if (!migrate) {
    db.authenticate = () => db.query("SELECT 1");
    return db;
  }
  for (const name of [
    "001-core",
    "002-product",
    "003-audit-target",
    "004-audit-leases",
  ]) {
    const existing = await db.query(
      "SELECT name FROM app_migrations WHERE name=$1",
      [name],
    );
    if (!existing.rows.length) {
      const sql = await readFile(
        new URL(`../db/migrations/${name}.sql`, import.meta.url),
        "utf8",
      );
      await db.exec(
        `BEGIN; ${sql} INSERT INTO app_migrations(name) VALUES ('${name}'); COMMIT;`,
      );
    }
  }
  db.authenticate = () => db.query("SELECT 1");
  return db;
}

export async function one(db, sql, values = []) {
  return (await db.query(sql, values)).rows[0] || null;
}
export async function all(db, sql, values = []) {
  return (await db.query(sql, values)).rows;
}
