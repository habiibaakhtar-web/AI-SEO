import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { chromium } from "@playwright/test";
import { resolve } from "node:path";
const app = express();
app.use(express.static(resolve("frontend/dist")));
app.get("/{*path}", (req, res) =>
  res.sendFile("index.html", { root: resolve("frontend/dist") }),
);
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
let browser;
try {
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    headless: true,
  });
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    let runs = 0,
      completed = false;
    const audit = {
      id: "audit-fixture",
      website_id: "site-fixture",
      website_name: "Hostinger test",
      website_url: "https://example.com/",
      created_at: new Date().toISOString(),
      status: "queued",
      progress: "Waiting to start",
      issues: [],
      recommendations: [],
      pages: [],
      coverage: { pagesCrawled: 1, pageLimit: 10, checks: 12 },
      overall_score: 80,
      technical_score: 80,
      on_page_score: 80,
      content_score: 80,
      scoring_version: "fixture",
      recommendation_status: "rule_based",
    };
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let data;
      if (path === "/api/auth/me")
        data = { id: "owner", name: "Owner", email: "owner@example.com" };
      else if (path.endsWith("/run")) {
        runs++;
        completed = true;
        data = { ...audit, status: "completed" };
      } else if (path === "/api/audits/audit-fixture")
        data = { ...audit, status: completed ? "completed" : "queued" };
      else data = [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data }),
      });
    });
    await page.goto(
      `http://127.0.0.1:${server.address().port}/audits/audit-fixture`,
    );
    await page
      .getByRole("heading", { name: "Your action plan" })
      .waitFor({ timeout: 15000 });
    assert.equal(
      runs,
      1,
      "the details page starts the bounded audit request once",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: `docs/screenshots/hostinger-audit-${viewport.width}.png`,
      fullPage: true,
    });
    await page.close();
    console.log(`Audit processing UI passed at ${viewport.width}px`);
  }
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
