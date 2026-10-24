import test from "node:test";
import assert from "node:assert/strict";
import { startupDiagnostic } from "../src/utils/startupDiagnostic.js";
import { parseEnvironment } from "../src/config/environment.js";

test("startup logs identify missing production settings without printing their values", () => {
  assert.throws(
    () =>
      parseEnvironment({ NODE_ENV: "production", JWT_SECRET: "private-short" }),
    (error) => {
      const message = startupDiagnostic(error);
      assert.ok(message.includes("DB_NAME"));
      assert.ok(message.includes("DB_USER"));
      assert.ok(!message.includes("private-short"));
      return true;
    },
  );
  assert.throws(
    () =>
      parseEnvironment({
        NODE_ENV: "production",
        DB_NAME: "db",
        DB_USER: "user",
        JWT_SECRET: "short-secret",
      }),
    (error) =>
      startupDiagnostic(error) ===
      "JWT_SECRET must have at least 32 characters.",
  );
});
test("database startup guidance never logs database passwords, queries or raw messages", () => {
  const error = Object.assign(
    new Error("Access denied for user private-user using private-password"),
    {
      code: "ER_ACCESS_DENIED_ERROR",
      sql: "INSERT secret-values",
      schemaStatement: 3,
      errno: 1045,
    },
  );
  const message = startupDiagnostic(error);
  assert.ok(message.includes("DB_USER"));
  assert.ok(message.includes("DB_PASSWORD"));
  assert.ok(message.includes("Schema statement: 3"));
  for (const value of ["private-user", "private-password", "secret-values"])
    assert.ok(!message.includes(value));
  assert.ok(
    !startupDiagnostic(new Error("sk-private-token")).includes(
      "sk-private-token",
    ),
  );
});
test("configuration errors list invalid field names and schema failures include only the statement number", () => {
  assert.throws(
    () => parseEnvironment({ PORT: "sensitive-value" }),
    (error) => {
      const message = startupDiagnostic(error);
      assert.ok(message.includes("PORT"));
      assert.ok(!message.includes("sensitive-value"));
      return true;
    },
  );
  assert.ok(
    startupDiagnostic({
      code: "ER_PARSE_ERROR",
      schemaStatement: 4,
      message: "private SQL",
    }).includes("Schema statement: 4"),
  );
  assert.ok(
    !startupDiagnostic({
      code: "ER_PARSE_ERROR",
      message: "private SQL",
    }).includes("private SQL"),
  );
});
