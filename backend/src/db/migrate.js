import { parseEnvironment } from "../config/environment.js";
import { openStore } from "../config/store.js";

let db;
try {
  const command = process.argv[2];
  if (!["up", "status"].includes(command)) throw new Error("Unknown command");
  db = await openStore(parseEnvironment(), { migrate: command === "up" });
  const rows = (
    await db.query("SELECT name,applied_at FROM app_migrations ORDER BY name")
  ).rows;
  const executed = rows.map((row) => row.name);
  const pending =
    db.kind === "mysql"
      ? ["mysql-001-hostinger", "mysql-002-audit-active"].filter(
          (name) => !executed.includes(name),
        )
      : [
          "001-core",
          "002-product",
          "003-audit-target",
          "004-audit-leases",
          "005-audit-active",
        ].filter((name) => !executed.includes(name));
  console.log(
    JSON.stringify({ database: db.kind, executed, pending }, null, 2),
  );
} catch {
  console.error(
    "Database command failed. Check your configuration and database access.",
  );
  process.exitCode = 1;
} finally {
  await db?.close();
}
