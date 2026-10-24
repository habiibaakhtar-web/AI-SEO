import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";

// Existing parameterized application queries retain PostgreSQL's numbered binds.
// Translate only the explicit SQL constructs used by this application.
export function compileMysql(sql, values = []) {
  const parameters = [];
  const text = sql
    .replace(/::(?:int|uuid)\b/g, "")
    .replace(
      /interval '(\d+) (minute|hour|day)s?'/gi,
      (_, n, unit) => `INTERVAL ${n} ${unit.toUpperCase()}`,
    )
    .replace(/\$(\d+)/g, (_, index) => {
      parameters.push(values[Number(index) - 1]);
      return "?";
    });
  return [text, parameters];
}
const jsonColumns = new Set(["coverage", "evidence", "input", "output"]);
function normalize(rows) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row)
        .filter(([key]) => !["url_hash", "active_website"].includes(key))
        .map(([key, value]) => [
          key,
          jsonColumns.has(key) && typeof value === "string"
            ? JSON.parse(value)
            : value,
        ]),
    ),
  );
}
function repository(connection) {
  async function execute(sql, values) {
    const [text, binds] = compileMysql(sql, values);
    const [rows] = await connection.query({ sql: text, timeout: 5000 }, binds);
    return {
      rows: Array.isArray(rows) ? normalize(rows) : [],
      affectedRows: rows.affectedRows,
    };
  }
  return {
    async query(sql, values = []) {
      const returning = sql.match(/\s+RETURNING\s+([\w, *]+)$/i);
      if (!returning) return execute(sql, values);
      const statement = sql.slice(0, returning.index);
      const insert = statement.match(/^INSERT INTO (\w+)\s*\(id,/i);
      const mutation = statement.match(
        /^(UPDATE|DELETE FROM) (\w+)[\s\S]*? WHERE ([\s\S]+)$/i,
      );
      if (insert) {
        await execute(statement, values);
        return execute(`SELECT ${returning[1]} FROM ${insert[1]} WHERE id=$1`, [
          values[0],
        ]);
      }
      if (!mutation) throw new Error("Unsupported RETURNING query");
      const [, operation, table, where] = mutation;
      if (operation.toUpperCase() === "DELETE FROM") {
        const result = await execute(
          `SELECT ${returning[1]} FROM ${table} WHERE ${where} FOR UPDATE`,
          values,
        );
        await execute(statement, values);
        return result;
      }
      const result = await execute(statement, values);
      if (!result.affectedRows) return { rows: [] };
      return execute(
        `SELECT ${returning[1]} FROM ${table} WHERE ${where}`,
        values,
      );
    },
  };
}
export async function openMysqlStore(config, { migrate = true } = {}) {
  const pool = mysql.createPool({
    host: config.DB_HOST || "127.0.0.1",
    port: config.DB_PORT || 3306,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    connectionLimit: 5,
    connectTimeout: 5000,
    timezone: "Z",
    supportBigNumbers: true,
    bigNumberStrings: false,
    multipleStatements: false,
    // Ensure both timestamp comparisons and inserts use UTC on Hostinger.
  });
  async function withConnection(callback, transaction = false) {
    const connection = await pool.getConnection();
    try {
      await connection.query("SET time_zone = '+00:00'");
      if (transaction) await connection.beginTransaction();
      const result = await callback(repository(connection));
      if (transaction) await connection.commit();
      return result;
    } catch (error) {
      if (transaction) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  const db = {
    kind: "mysql",
    query: (sql, values) =>
      withConnection(
        (repo) => repo.query(sql, values),
        /\sRETURNING\s/i.test(sql),
      ),
    transaction: (callback) => withConnection(callback, true),
    authenticate: () => withConnection((repo) => repo.query("SELECT 1")),
    close: () => pool.end(),
  };
  try {
    if (migrate) {
      const connection = await pool.getConnection();
      try {
        const [[lock]] = await connection.query(
          "SELECT GET_LOCK(SHA2(CONCAT('seo-schema-', DATABASE()),256), 30) AS acquired",
        );
        if (lock.acquired !== 1)
          throw new Error("Schema migration is already running");
        const schema = await readFile(
          new URL("../db/mysql-schema.sql", import.meta.url),
          "utf8",
        );
        const statements = schema
          .split(";")
          .map((sql) => sql.trim())
          .filter(Boolean);
        for (const [index, sql] of statements.entries()) {
          try {
            await connection.query(sql);
          } catch (error) {
            error.schemaStatement = index + 1;
            throw error;
          }
        }
      } finally {
        await connection.query(
          "SELECT RELEASE_LOCK(SHA2(CONCAT('seo-schema-', DATABASE()),256))",
        );
        connection.release();
      }
    }
    return db;
  } catch (error) {
    await pool.end();
    throw error;
  }
}
