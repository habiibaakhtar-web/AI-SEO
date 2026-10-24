import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { one, all } from "../config/store.js";
import { success } from "../utils/apiResponse.js";
import { check } from "../utils/httpError.js";
import { validateUrl } from "../services/safeFetch.js";
import {
  hashPassword,
  verifyPassword,
  publicUser,
} from "../services/authService.js";
import { rateLimit } from "express-rate-limit";
import { suggestLinks } from "../services/linkService.js";
import { HttpError } from "../utils/httpError.js";

const siteInput = z.object({
  name: z.string().trim().min(2).max(100),
  url: z.string().max(2000),
  description: z.string().trim().max(1000).default(""),
});
export function productRoutes(db, auth, audits, tools) {
  const router = Router();
  router.use(auth.authenticate);
  router.get("/ai/status", async (req, res) => {
    try {
      success(res, "AI configuration loaded.", await tools.status());
    } catch {
      success(res, "The AI service is unavailable.", {
        configured: false,
        provider: "Unavailable",
        model: "",
        connectionVerified: false,
      });
    }
  });
  router.post(
    "/ai/test",
    rateLimit({
      windowMs: 60000,
      limit: 3,
      keyGenerator: (req) => req.user.id,
      message: {
        success: false,
        message: "Please wait a minute before testing again.",
      },
    }),
    async (req, res) => {
      try {
        success(res, "AI connection verified.", await tools.testConnection());
      } catch (error) {
        throw new HttpError(
          503,
          error.message === "AI_UNAVAILABLE"
            ? "Configure the AI provider in the hosting environment first."
            : error.message,
        );
      }
    },
  );
  const website = async (id, userId) => {
    z.uuid().parse(id);
    const site = await one(
      db,
      "SELECT * FROM websites WHERE id=$1 AND user_id=$2",
      [id, userId],
    );
    check(site, 404, "Website not found.");
    return site;
  };
  const audit = async (id, userId) => {
    z.uuid().parse(id);
    const row = await one(
      db,
      "SELECT a.*,w.name AS website_name,coalesce(nullif(a.target_url,''),w.url) AS website_url FROM audits a JOIN websites w ON w.id=a.website_id WHERE a.id=$1 AND w.user_id=$2",
      [id, userId],
    );
    check(row, 404, "Audit not found.");
    return row;
  };
  router.patch("/users/me", async (req, res) => {
    const body = z
      .object({ name: z.string().trim().min(2).max(100) })
      .parse(req.body);
    const user = await one(
      db,
      "UPDATE users SET name=$1,updated_at=now() WHERE id=$2 RETURNING id,name,email",
      [body.name, req.user.id],
    );
    success(res, "Profile updated.", publicUser(user));
  });
  router.post("/users/me/password", async (req, res) => {
    const body = z
      .object({
        currentPassword: z.string().min(1).max(128),
        password: z.string().min(10).max(128),
      })
      .parse(req.body);
    const user = await one(db, "SELECT password_hash FROM users WHERE id=$1", [
      req.user.id,
    ]);
    check(
      await verifyPassword(body.currentPassword, user.password_hash),
      400,
      "Current password is incorrect.",
    );
    await db.query(
      "UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2",
      [await hashPassword(body.password), req.user.id],
    );
    await db.query("DELETE FROM sessions WHERE user_id=$1 AND id<>$2", [
      req.user.id,
      req.sessionId,
    ]);
    success(res, "Password updated. Other sessions have been signed out.");
  });
  router.get("/websites", async (req, res) =>
    success(
      res,
      "Websites loaded.",
      await all(
        db,
        `SELECT w.*,
    (SELECT overall_score FROM audits a WHERE a.website_id=w.id AND a.status='completed' ORDER BY created_at DESC LIMIT 1) AS current_score
    FROM websites w WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
        [req.user.id],
      ),
    ),
  );
  router.post("/websites", async (req, res) => {
    const body = siteInput.parse(req.body);
    const url = validateUrl(body.url).href;
    const count = await one(
      db,
      "SELECT count(*)::int AS total FROM websites WHERE user_id=$1",
      [req.user.id],
    );
    check(
      count.total < 10,
      400,
      "This local workspace supports up to 10 websites.",
    );
    const row = await one(
      db,
      "INSERT INTO websites(id,user_id,name,url,description) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [randomUUID(), req.user.id, body.name, url, body.description],
    );
    success(res, "Website added.", row, 201);
  });
  router.get("/websites/:id", async (req, res) =>
    success(res, "Website loaded.", await website(req.params.id, req.user.id)),
  );
  router.get("/websites/:id/links", async (req, res) => {
    const site = await website(req.params.id, req.user.id);
    const latest = await one(
      db,
      "SELECT id FROM audits WHERE website_id=$1 AND status='completed' ORDER BY created_at DESC LIMIT 1",
      [site.id],
    );
    const pages = latest
      ? await all(
          db,
          "SELECT url,evidence FROM crawled_pages WHERE audit_id=$1",
          [latest.id],
        )
      : [];
    success(res, "Link suggestions loaded.", suggestLinks(pages));
  });
  router.put("/websites/:id", async (req, res) => {
    await website(req.params.id, req.user.id);
    const body = siteInput.parse(req.body);
    const url = validateUrl(body.url).href;
    const active = await one(
      db,
      "SELECT id FROM audits WHERE website_id=$1 AND status IN ('queued','running')",
      [req.params.id],
    );
    check(
      !active,
      409,
      "Wait for the current audit before editing this website.",
    );
    const row = await one(
      db,
      "UPDATE websites SET name=$1,url=$2,description=$3,updated_at=now() WHERE id=$4 RETURNING *",
      [body.name, url, body.description, req.params.id],
    );
    success(res, "Website updated.", row);
  });
  router.delete("/websites/:id", async (req, res) => {
    await website(req.params.id, req.user.id);
    check(
      !(await one(
        db,
        "SELECT id FROM audits WHERE website_id=$1 AND status IN ('queued','running')",
        [req.params.id],
      )),
      409,
      "Wait for the audit to finish before deleting this website.",
    );
    await db.query("DELETE FROM websites WHERE id=$1", [req.params.id]);
    success(res, "Website deleted.");
  });
  router.post("/audits", async (req, res) => {
    const body = z.object({ websiteId: z.uuid() }).parse(req.body);
    const site = await website(body.websiteId, req.user.id);
    const count = await one(
      db,
      "SELECT count(*)::int AS total FROM audits a JOIN websites w ON a.website_id=w.id WHERE w.user_id=$1 AND a.created_at>now()-interval '1 hour'",
      [req.user.id],
    );
    check(count.total < 10, 429, "You can run up to 10 audits per hour.");
    const row = await one(
      db,
      "INSERT INTO audits(id,website_id,status,target_url,progress,active_website) VALUES($1,$2,'queued',$3,'Waiting to start',$2) RETURNING *",
      [randomUUID(), site.id, site.url],
    );
    success(
      res,
      "Audit queued. Open it to start or resume processing.",
      row,
      202,
    );
  });
  router.post("/audits/:id/run", async (req, res) => {
    const row = await audit(req.params.id, req.user.id);
    await audits.run(row.id);
    success(res, "Audit processing checked.", await audit(row.id, req.user.id));
  });
  router.get("/audits", async (req, res) => {
    const page = Math.max(1, Math.min(10000, Number(req.query.page) || 1));
    if (req.query.websiteId) await website(req.query.websiteId, req.user.id);
    const rows = await all(
      db,
      "SELECT a.*,w.name AS website_name,coalesce(nullif(a.target_url,''),w.url) AS website_url FROM audits a JOIN websites w ON w.id=a.website_id WHERE w.user_id=$1 AND ($3::uuid IS NULL OR w.id=$3::uuid) ORDER BY a.created_at DESC LIMIT 50 OFFSET $2",
      [req.user.id, (page - 1) * 50, req.query.websiteId || null],
    );
    success(res, "Audit history loaded.", rows);
  });
  router.get("/audits/:id", async (req, res) => {
    const row = await audit(req.params.id, req.user.id);
    const issues = await all(
      db,
      `SELECT * FROM seo_issues WHERE audit_id=$1 ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at`,
      [row.id],
    );
    const recommendations = await all(
      db,
      "SELECT * FROM recommendations WHERE audit_id=$1",
      [row.id],
    );
    const pages = await all(
      db,
      "SELECT * FROM crawled_pages WHERE audit_id=$1 ORDER BY created_at",
      [row.id],
    );
    success(res, "Audit loaded.", { ...row, issues, recommendations, pages });
  });
  router.get("/audits/:id/issues", async (req, res) => {
    const row = await audit(req.params.id, req.user.id);
    success(
      res,
      "Issues loaded.",
      await all(db, "SELECT * FROM seo_issues WHERE audit_id=$1", [row.id]),
    );
  });
  router.patch("/issues/:id/status", async (req, res) => {
    z.uuid().parse(req.params.id);
    const body = z
      .object({
        status: z.enum(["open", "in_progress", "resolved", "ignored"]),
      })
      .parse(req.body);
    const issue = await one(
      db,
      "SELECT i.id FROM seo_issues i JOIN audits a ON a.id=i.audit_id JOIN websites w ON w.id=a.website_id WHERE i.id=$1 AND w.user_id=$2",
      [req.params.id, req.user.id],
    );
    check(issue, 404, "Issue not found.");
    const row = await one(
      db,
      "UPDATE seo_issues SET status=$1,updated_at=now() WHERE id=$2 RETURNING *",
      [body.status, issue.id],
    );
    success(res, "Task updated. Run a new audit to verify the fix.", row);
  });
  router.get("/keywords", async (req, res) => {
    const site = await website(req.query.websiteId, req.user.id);
    success(
      res,
      "Keywords loaded.",
      await all(
        db,
        "SELECT * FROM keywords WHERE website_id=$1 ORDER BY created_at DESC LIMIT 500",
        [site.id],
      ),
    );
  });
  router.post("/keywords", async (req, res) => {
    const body = z
      .object({
        websiteId: z.uuid(),
        keyword: z.string().trim().min(2).max(200),
        intent: z
          .enum([
            "informational",
            "navigational",
            "commercial",
            "transactional",
          ])
          .default("informational"),
        category: z.string().max(100).default(""),
        priority: z.enum(["high", "medium", "low"]).default("medium"),
        targetPage: z.string().max(2000).default(""),
        status: z
          .enum(["planned", "in_progress", "published"])
          .default("planned"),
        notes: z.string().max(2000).default(""),
      })
      .parse(req.body);
    await website(body.websiteId, req.user.id);
    const row = await one(
      db,
      "INSERT INTO keywords(id,website_id,keyword,intent,notes,category,priority,target_page,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
      [
        randomUUID(),
        body.websiteId,
        body.keyword,
        body.intent,
        body.notes,
        body.category,
        body.priority,
        body.targetPage,
        body.status,
      ],
    );
    success(res, "Keyword saved.", row, 201);
  });
  router.post("/keywords/generate", async (req, res) => {
    const body = z
      .object({ websiteId: z.uuid(), topic: z.string().trim().min(2).max(200) })
      .parse(req.body);
    const site = await website(body.websiteId, req.user.id);
    const result = await tools.generate("keywords", {
      topic: body.topic,
      site: { name: site.name, url: site.url, description: site.description },
    });
    const suggestions = result.output.text
      .split("\n")
      .map((s) => s.replace(/^\s*\d+[.)]\s*/, "").trim())
      .filter((s) => s.length >= 2 && s.length <= 200)
      .slice(0, 10);
    success(res, "Keyword ideas prepared.", {
      suggestions,
      source: result.source,
    });
  });
  router.put("/keywords/:id", async (req, res) => {
    z.uuid().parse(req.params.id);
    const row = await one(
      db,
      "SELECT k.id FROM keywords k JOIN websites w ON w.id=k.website_id WHERE k.id=$1 AND w.user_id=$2",
      [req.params.id, req.user.id],
    );
    check(row, 404, "Keyword not found.");
    const body = z
      .object({
        keyword: z.string().trim().min(2).max(200),
        category: z.string().max(100).default(""),
        intent: z.enum([
          "informational",
          "navigational",
          "commercial",
          "transactional",
        ]),
        priority: z.enum(["high", "medium", "low"]),
        targetPage: z.string().max(2000).default(""),
        status: z.enum(["planned", "in_progress", "published"]),
        notes: z.string().max(2000).default(""),
      })
      .parse(req.body);
    const updated = await one(
      db,
      "UPDATE keywords SET keyword=$1,category=$2,intent=$3,priority=$4,target_page=$5,status=$6,notes=$7 WHERE id=$8 RETURNING *",
      [
        body.keyword,
        body.category,
        body.intent,
        body.priority,
        body.targetPage,
        body.status,
        body.notes,
        row.id,
      ],
    );
    success(res, "Keyword updated.", updated);
  });
  router.delete("/keywords/:id", async (req, res) => {
    z.uuid().parse(req.params.id);
    const row = await one(
      db,
      "SELECT k.id FROM keywords k JOIN websites w ON w.id=k.website_id WHERE k.id=$1 AND w.user_id=$2",
      [req.params.id, req.user.id],
    );
    check(row, 404, "Keyword not found.");
    await db.query("DELETE FROM keywords WHERE id=$1", [row.id]);
    success(res, "Keyword removed.");
  });
  router.get("/content", async (req, res) => {
    const site = await website(req.query.websiteId, req.user.id);
    success(
      res,
      "Content loaded.",
      await all(
        db,
        "SELECT * FROM content_items WHERE website_id=$1 ORDER BY created_at DESC LIMIT 100",
        [site.id],
      ),
    );
  });
  const generationLimit = rateLimit({
    windowMs: 900000,
    limit: 20,
    keyGenerator: (req) => req.user.id,
    message: {
      success: false,
      message: "You can create up to 20 drafts every 15 minutes.",
    },
  });
  router.post("/content/:kind", generationLimit, async (req, res) => {
    const kind = z
      .enum(["ideas", "brief", "meta", "assistant"])
      .parse(req.params.kind);
    const body = z
      .object({
        websiteId: z.uuid(),
        topic: z.string().trim().min(2).max(500),
        keyword: z.string().max(200).default(""),
        business: z.string().max(100).default(""),
        location: z.string().max(100).default(""),
      })
      .parse(req.body);
    const site = await website(body.websiteId, req.user.id);
    const latest = await one(
      db,
      "SELECT * FROM audits WHERE website_id=$1 AND status='completed' ORDER BY created_at DESC LIMIT 1",
      [site.id],
    );
    const issues = latest
      ? await all(
          db,
          "SELECT title,severity,description,recommendation FROM seo_issues WHERE audit_id=$1 LIMIT 30",
          [latest.id],
        )
      : [];
    const result = await tools.generate(kind, {
      ...body,
      site: { name: site.name, url: site.url, description: site.description },
      audit: latest ? { overallScore: latest.overall_score, issues } : null,
    });
    const row = await one(
      db,
      "INSERT INTO content_items(id,website_id,kind,input,output,source) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [
        randomUUID(),
        site.id,
        kind,
        JSON.stringify(body),
        JSON.stringify(result.output),
        result.source,
      ],
    );
    success(res, "Draft saved.", row, 201);
  });
  return router;
}
