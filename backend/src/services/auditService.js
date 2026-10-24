import { randomUUID } from "node:crypto";
import { one, all } from "../config/store.js";
import { crawlWebsite } from "./crawlerService.js";
import { analyze } from "./seoService.js";

const errorMessages = {
  ROBOTS_BLOCKED:
    "This website does not allow our crawler under its robots.txt rules.",
  ROBOTS_UNAVAILABLE: "We could not safely read this website’s crawler rules.",
  NOT_HTML: "This URL does not serve an HTML webpage.",
  PRIVATE_NETWORK:
    "This URL resolves to a private network and cannot be audited.",
  TIMEOUT: "The website took too long to respond.",
};
export function auditService(db, tools, { crawler = crawlWebsite } = {}) {
  let active = false,
    stopped = false;
  async function execute(audit) {
    const deadline = Date.now() + 95000;
    const workDb = {
      query: async (sql, values) => {
        if (Date.now() >= deadline) throw new Error("TIMEOUT");
        return db.query(sql, values);
      },
    };
    try {
      for (const table of ["recommendations", "seo_issues", "crawled_pages"])
        await workDb.query(`DELETE FROM ${table} WHERE audit_id=$1`, [
          audit.id,
        ]);
      const site = await one(workDb, "SELECT * FROM websites WHERE id=$1", [
        audit.website_id,
      ]);
      await workDb.query(
        "UPDATE audits SET status='running',progress='Reading website and crawler rules' WHERE id=$1",
        [audit.id],
      );
      const crawl = await crawler(audit.target_url || site.url, (progress) =>
        workDb.query("UPDATE audits SET progress=$1 WHERE id=$2", [
          progress,
          audit.id,
        ]),
      );
      crawl.keywords = await all(
        workDb,
        "SELECT keyword FROM keywords WHERE website_id=$1 LIMIT 20",
        [site.id],
      );
      const result = analyze(crawl);
      await workDb.query(
        "UPDATE audits SET progress='Saving measured SEO findings' WHERE id=$1",
        [audit.id],
      );
      for (const page of crawl.pages) {
        const { text, ...evidence } = page;
        await workDb.query(
          "INSERT INTO crawled_pages(id,audit_id,url,http_status,evidence) VALUES($1,$2,$3,$4,$5)",
          [
            randomUUID(),
            audit.id,
            page.url,
            page.httpStatus,
            JSON.stringify(evidence),
          ],
        );
      }
      const issues = [];
      for (const issue of result.issues) {
        const id = randomUUID();
        issues.push({ ...issue, id });
        await workDb.query(
          "INSERT INTO seo_issues(id,audit_id,title,category,severity,description,why_it_matters,recommendation,page_url,check_id,evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
          [
            id,
            audit.id,
            issue.title,
            issue.category,
            issue.severity,
            issue.description,
            issue.whyItMatters,
            issue.recommendation,
            issue.pageUrl,
            issue.checkId,
            JSON.stringify(issue.evidence),
          ],
        );
      }
      await workDb.query(
        "UPDATE audits SET overall_score=$1,technical_score=$2,on_page_score=$3,content_score=$4,scoring_version=$5,coverage=$6,progress=$7 WHERE id=$8",
        [
          result.overall,
          result.technical,
          result.onPage,
          result.content,
          result.version,
          JSON.stringify(result.coverage),
          "Preparing recommendations",
          audit.id,
        ],
      );
      let source = "rule",
        recommendations = issues.map((issue) => ({
          issue_id: issue.id,
          priority: issue.severity,
          reason: issue.whyItMatters,
          recommendation: issue.recommendation,
        }));
      if (issues.length) {
        try {
          const response = await tools.recommend(audit.id, issues);
          recommendations = response;
          source = "ai";
        } catch {}
      }
      for (const rec of recommendations)
        await workDb.query(
          "INSERT INTO recommendations(id,audit_id,issue_id,recommendation,reason,priority,suggested_text,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            randomUUID(),
            audit.id,
            rec.issue_id,
            rec.recommendation,
            rec.reason,
            rec.priority,
            rec.suggested_text || null,
            source,
          ],
        );
      await workDb.query(
        "UPDATE audits SET status='completed',lease_expires_at=NULL,lease_owner=NULL,recommendation_status=$1,progress='Audit complete',completed_at=now(),updated_at=now() WHERE id=$2",
        [source === "ai" ? "ai" : "rule_based", audit.id],
      );
    } catch (error) {
      const message =
        errorMessages[error.message] ||
        (error.message.startsWith("HTTP_")
          ? "The website returned an HTTP error. Check the URL and try again."
          : "We could not complete this audit. The website may be unavailable or block automated requests.");
      await db.query(
        "UPDATE audits SET status='failed',lease_expires_at=NULL,lease_owner=NULL,progress=$1,error_code='CRAWL_FAILED',completed_at=now(),updated_at=now() WHERE id=$2",
        [message, audit.id],
      );
    }
  }
  return {
    async run(id) {
      if (active || stopped) return;
      active = true;
      try {
        const audit = await db.transaction(async (tx) => {
          const row = await one(
            tx,
            "SELECT * FROM audits WHERE id=$1 FOR UPDATE",
            [id],
          );
          if (!row || !["queued", "running"].includes(row.status)) return null;
          if (
            row.status === "running" &&
            row.lease_expires_at &&
            new Date(row.lease_expires_at).getTime() > Date.now()
          )
            return null;
          await tx.query(
            "UPDATE audits SET status='running',lease_owner=$1,lease_expires_at=now()+interval '2 minutes',progress='Starting website checks',updated_at=now() WHERE id=$2",
            [randomUUID(), id],
          );
          return row;
        });
        if (audit) await execute(audit);
      } finally {
        active = false;
      }
    },
    // Processing is triggered only by an authenticated, bounded HTTP request.
    async start() {},
    async stop() {
      stopped = true;
      while (active) await new Promise((resolve) => setTimeout(resolve, 100));
    },
  };
}
