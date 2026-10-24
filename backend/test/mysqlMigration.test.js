import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openStore, one } from "../src/config/store.js";

test(
  "MySQL uses a regular unique audit marker and upgrades old generated markers without losing data",
  { skip: !process.env.TEST_MYSQL_CONFIG },
  async (t) => {
    const config = JSON.parse(process.env.TEST_MYSQL_CONFIG);
    assert.ok(config.DB_NAME.endsWith("_test"));
    let db = await openStore(config);
    const user = randomUUID(),
      site = randomUUID(),
      queued = randomUUID(),
      completed = randomUUID();
    try {
      const column = await one(
        db,
        "SELECT EXTRA AS extra FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audits' AND COLUMN_NAME='active_website'",
      );
      assert.ok(!/GENERATED/i.test(column.extra));
      await db.query(
        "INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4)",
        [user, "Migration owner", user + "@example.com", "unused-test-hash"],
      );
      await db.query(
        "INSERT INTO websites(id,user_id,name,url,description) VALUES($1,$2,$3,$4,$5)",
        [site, user, "Migration fixture", "https://example.com/", ""],
      );
      for (const [id, status, marker] of [
        [queued, "queued", site],
        [completed, "completed", null],
      ])
        await db.query(
          "INSERT INTO audits(id,website_id,status,active_website,target_url,progress) VALUES($1,$2,$3,$4,'https://example.com/','Fixture')",
          [id, site, status, marker],
        );
      // Construct the old schema on servers that permit it, to exercise the real upgrade.
      try {
        await db.query(
          "ALTER TABLE audits DROP INDEX audits_one_active, DROP COLUMN active_website, ADD COLUMN active_website CHAR(36) CHARACTER SET ascii GENERATED ALWAYS AS (CASE WHEN status IN ('queued','running') THEN website_id ELSE NULL END) STORED, ADD UNIQUE KEY audits_one_active(active_website)",
        );
      } catch (error) {
        if (error.errno === 1901) {
          t.diagnostic(
            "This server already rejects the legacy generated expression; the new plain schema succeeds.",
          );
          return;
        }
        throw error;
      }
      await db.query(
        "DELETE FROM app_migrations WHERE name='mysql-002-audit-active'",
      );
      await db.close();
      db = null;
      db = await openStore(config);
      assert.ok(
        !/GENERATED/i.test(
          (
            await one(
              db,
              "SELECT EXTRA AS extra FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audits' AND COLUMN_NAME='active_website'",
            )
          ).extra,
        ),
      );
      assert.equal(
        (
          await one(
            db,
            "SELECT active_website AS marker FROM audits WHERE id=$1",
            [queued],
          )
        ).marker,
        site,
      );
      assert.equal(
        (
          await one(
            db,
            "SELECT active_website AS marker FROM audits WHERE id=$1",
            [completed],
          )
        ).marker,
        null,
      );
      assert.equal(
        (
          await one(
            db,
            "SELECT count(*) AS n FROM audits WHERE website_id=$1",
            [site],
          )
        ).n,
        2,
      );
      await assert.rejects(
        db.query(
          "INSERT INTO audits(id,website_id,status,active_website,target_url,progress) VALUES($1,$2,'queued',$2,'https://example.com/','Fixture')",
          [randomUUID(), site],
        ),
        (error) => error.code === "ER_DUP_ENTRY",
      );
      await db.close();
      db = null;
      db = await openStore(config);
      assert.equal(
        (
          await one(
            db,
            "SELECT count(*) AS n FROM audits WHERE website_id=$1",
            [site],
          )
        ).n,
        2,
      );
    } finally {
      if (db) {
        await db.query("DELETE FROM users WHERE id=$1", [user]);
        await db.close();
      }
    }
  },
);
