import mysql from "mysql2/promise";
import { spawn } from "node:child_process";
const config = JSON.parse(process.env.TEST_MYSQL_CONFIG || "{}");
if (!config.DB_NAME?.endsWith("_test"))
  throw new Error(
    "Set TEST_MYSQL_CONFIG to a dedicated database name ending in _test.",
  );
const connection = await mysql.createConnection({
  host: config.DB_HOST || "127.0.0.1",
  port: config.DB_PORT || 3306,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
});
try {
  await connection.query("SET FOREIGN_KEY_CHECKS=0");
  for (const table of [
    "recommendations",
    "seo_issues",
    "crawled_pages",
    "audits",
    "content_items",
    "keywords",
    "password_resets",
    "sessions",
    "websites",
    "users",
    "app_migrations",
  ])
    await connection.query(`DROP TABLE IF EXISTS ${table}`);
} finally {
  await connection.end();
}
const child = spawn(
  process.execPath,
  [
    "--test",
    "--test-concurrency=1",
    "backend/test/product.test.js",
    "backend/test/llm.test.js",
    "backend/test/mysqlMigration.test.js",
  ],
  { stdio: "inherit", windowsHide: true },
);
child.on("error", () => {
  console.error("Could not launch MySQL tests.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code;
});
