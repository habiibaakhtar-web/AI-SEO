import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { openStore, one } from "../src/config/store.js";
import { parseEnvironment } from "../src/config/environment.js";
import { createApp } from "../src/app.js";

test("production reset emails hide tokens, revoke sessions, and invalidate failed deliveries", async () => {
  const db = await openStore({ DATA_DIR: "memory://" });
  const config = parseEnvironment({
    NODE_ENV: "production",
    DB_NAME: "mail_test",
    DB_USER: "test",
    FRONTEND_ORIGIN: "https://seo.example",
    JWT_SECRET: "x".repeat(48),
  });
  let sent,
    fail = false;
  const mailer = {
    configured: true,
    async sendReset(email, url) {
      if (fail) throw new Error("smtp-private-password");
      sent = { email, url };
    },
  };
  const app = createApp({
    config,
    database: db,
    mailer,
    audits: {},
    tools: {},
  });
  try {
    assert.equal(
      (
        await request(app)
          .post("/api/auth/register")
          .send({
            name: "Mail Owner",
            email: "mail@example.com",
            password: "StrongPassword123",
          })
      ).status,
      201,
    );
    const forgot = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "mail@example.com" });
    assert.equal(forgot.status, 200);
    assert.deepEqual(forgot.body.data, {});
    assert.equal(sent.email, "mail@example.com");
    const token = new URL(sent.url).searchParams.get("token");
    assert.ok(!JSON.stringify(forgot.body).includes(token));
    assert.equal(
      (
        await request(app)
          .post("/api/auth/reset-password")
          .send({ token, password: "ChangedPassword123" })
      ).status,
      200,
    );
    assert.equal(
      Number((await one(db, "SELECT count(*) AS n FROM sessions")).n),
      0,
    );
    assert.equal(
      (
        await request(app)
          .post("/api/auth/reset-password")
          .send({ token, password: "ChangedPassword123" })
      ).status,
      400,
    );
    fail = true;
    const failed = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "mail@example.com" });
    assert.equal(failed.status, 503);
    assert.ok(!JSON.stringify(failed.body).includes("smtp-private-password"));
    assert.equal(
      Number((await one(db, "SELECT count(*) AS n FROM password_resets")).n),
      0,
    );
  } finally {
    await db.close();
  }
});
