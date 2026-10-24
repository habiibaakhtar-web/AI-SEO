import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { openStore, one } from "../src/config/store.js";

test("file-backed PostgreSQL retains data when reopened", async () => {
  const base = resolve(".data/test");
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(base + "/persistence-");
  let db = await openStore({ DATA_DIR: directory });
  const id = randomUUID();
  await db.query(
    "INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4)",
    [id, "Persistent user", id + "@example.com", "a hash"],
  );
  await db.close();
  db = await openStore({ DATA_DIR: directory });
  assert.equal(
    (await one(db, "SELECT name FROM users WHERE id=$1", [id])).name,
    "Persistent user",
  );
  assert.equal(
    (await db.query("SELECT name FROM app_migrations")).rows.length,
    5,
  );
  await db.close();
});
