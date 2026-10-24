import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { toolService } from "../src/services/toolService.js";
const config = {
  LLM_API_KEY: "private-test-key",
  LLM_MODEL: "test-model",
  LLM_API_URL: "https://openrouter.ai/api/v1/chat/completions",
  FRONTEND_ORIGIN: "https://seo-test.hostingersite.com",
};
const reply = (value) =>
  new Response(
    JSON.stringify({
      choices: [
        { finish_reason: "stop", message: { content: JSON.stringify(value) } },
      ],
    }),
  );
test("Node AI provider preserves grounding, server-only credentials and provider configuration", async () => {
  let body;
  const tools = toolService(config, {
    fetcher: async (url, options) => {
      assert.equal(url, config.LLM_API_URL);
      assert.equal(options.headers.Authorization, "Bearer private-test-key");
      assert.equal(options.headers["HTTP-Referer"], config.FRONTEND_ORIGIN);
      body = JSON.parse(options.body);
      assert.ok(body.messages[0].content.includes("untrusted"));
      return reply({ text: "A reviewed draft." });
    },
  });
  assert.equal((await tools.status()).configured, true);
  assert.ok(!JSON.stringify(await tools.status()).includes(config.LLM_API_KEY));
  assert.equal(
    (await tools.generate("brief", { topic: "SEO", site: { name: "Example" } }))
      .source,
    "ai",
  );
  assert.equal(body.model, "test-model");
  assert.equal(body.response_format.type, "json_object");
});
test("Node recommendations reject fabricated, duplicate or changed-severity issue references", async () => {
  const id = randomUUID(),
    issue = { id, severity: "high", title: "Missing title" };
  for (const recommendations of [
    [],
    [
      {
        issue_id: randomUUID(),
        recommendation: "Fix",
        reason: "Reason",
        priority: "high",
      },
    ],
    [
      {
        issue_id: id,
        recommendation: "Fix",
        reason: "Reason",
        priority: "low",
      },
    ],
  ]) {
    const tools = toolService(config, {
      fetcher: async () => reply({ recommendations }),
    });
    await assert.rejects(tools.recommend(randomUUID(), [issue]));
  }
  const tools = toolService(config, {
    fetcher: async () =>
      reply({
        recommendations: [
          {
            issue_id: id,
            recommendation: "Fix",
            reason: "Reason",
            priority: "high",
          },
        ],
      }),
  });
  assert.equal((await tools.recommend(randomUUID(), [issue]))[0].issue_id, id);
});
test("provider failures fall back honestly and never expose provider error bodies", async () => {
  const tools = toolService(config, {
    fetcher: async () =>
      new Response("private-account-details", { status: 401 }),
  });
  await assert.rejects(
    tools.testConnection(),
    (error) => !error.message.includes("private-account-details"),
  );
  assert.equal(
    (
      await tools.generate("keywords", {
        topic: "SEO",
        site: { name: "Example" },
      })
    ).source,
    "rule",
  );
});
test("oversized or truncated provider output is rejected", async () => {
  for (const response of [
    new Response("x".repeat(250001)),
    new Response(
      JSON.stringify({
        choices: [{ finish_reason: "length", message: { content: "{}" } }],
      }),
    ),
  ]) {
    const tools = toolService(config, { fetcher: async () => response });
    await assert.rejects(tools.testConnection());
  }
});
