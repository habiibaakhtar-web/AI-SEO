import { load } from "cheerio";
import robotsParser from "robots-parser";
import { safeFetch } from "./safeFetch.js";

export function extractPage(response) {
  const $ = load(response.body);
  const textRoot = $("body").clone();
  textRoot.find("script,style,noscript,nav,footer").remove();
  const text = textRoot.text().replace(/\s+/g, " ").trim();
  const links = [];
  $("a[href]").each((_, el) => {
    try {
      const url = new URL($(el).attr("href"), response.url);
      url.hash = "";
      if (["http:", "https:"].includes(url.protocol)) links.push(url.href);
    } catch {}
  });
  return {
    url: response.url,
    httpStatus: response.status,
    title: $("title").first().text().trim(),
    description: $('meta[name="description"]').attr("content")?.trim() || "",
    h1: $("h1")
      .map((_, el) => $(el).text().trim())
      .get(),
    h2: $("h2")
      .map((_, el) => $(el).text().trim())
      .get(),
    headingLevels: $("h1,h2,h3,h4,h5,h6")
      .map((_, el) => Number(el.tagName.slice(1)))
      .get(),
    images: $("img").length,
    missingAlt: $("img").filter((_, el) => $(el).attr("alt") === undefined)
      .length,
    canonical: $('link[rel="canonical"]').attr("href") || "",
    viewport: $('meta[name="viewport"]').attr("content") || "",
    wordCount: text ? text.split(" ").length : 0,
    text: text.slice(0, 50000),
    language: $("html").attr("lang") || "",
    links: [...new Set(links)].slice(0, 200),
    redirects: response.redirects,
    noindex: ($('meta[name="robots"]').attr("content") || "")
      .toLowerCase()
      .includes("noindex"),
  };
}
export async function crawlWebsite(start, onProgress, fetcher = safeFetch) {
  const deadline = Date.now() + 55000;
  async function fetchRequired(url, options = {}) {
    try {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error("TIMEOUT");
      return await fetcher(url, {
        ...options,
        timeout: Math.min(options.timeout || 30000, remaining),
      });
    } catch (error) {
      if (
        ![
          "TIMEOUT",
          "RESPONSE_ABORTED",
          "ECONNRESET",
          "ETIMEDOUT",
          "EAI_AGAIN",
        ].includes(error.code || error.message)
      )
        throw error;
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw error;
      await onProgress("Retrying a temporary website connection failure");
      return fetcher(url, { ...options, timeout: Math.min(30000, remaining) });
    }
  }
  const root = await fetchRequired(start);
  if (root.status >= 400) throw new Error(`HTTP_${root.status}`);
  if (!(root.headers["content-type"] || "").includes("text/html"))
    throw new Error("NOT_HTML");
  const origin = new URL(root.url).origin;
  const robotsUrl = origin + "/robots.txt";
  let robotsResponse;
  try {
    robotsResponse = await fetchRequired(robotsUrl, { maxBytes: 256000 });
  } catch {
    throw new Error("ROBOTS_UNAVAILABLE");
  }
  if (
    robotsResponse.status >= 500 ||
    robotsResponse.status === 401 ||
    robotsResponse.status === 403
  )
    throw new Error("ROBOTS_UNAVAILABLE");
  const robots = robotsParser(
    robotsUrl,
    robotsResponse.status === 200 ? robotsResponse.body : "",
  );
  if (robots.isAllowed(root.url, "AIGrowthAudit") === false)
    throw new Error("ROBOTS_BLOCKED");
  const delay = Math.min(
    10000,
    Math.max(300, (robots.getCrawlDelay("AIGrowthAudit") || 0) * 1000),
  );
  const sitemapUrl =
    robots.getSitemaps().find((url) => new URL(url).origin === origin) ||
    origin + "/sitemap.xml";
  let sitemap = null;
  try {
    const result = await fetcher(sitemapUrl, {
      maxBytes: 256000,
      timeout: Math.max(1, Math.min(8000, deadline - Date.now())),
    });
    sitemap =
      result.status === 200 &&
      /<(?:urlset|sitemapindex)[\s>]/i.test(result.body);
  } catch {}
  const pages = [extractPage(root)];
  const visited = new Set([root.url]);
  const queued = [...pages[0].links];
  let skipped = 0;
  const failures = [];
  while (
    queued.length &&
    pages.length < 10 &&
    visited.size < 25 &&
    Date.now() < deadline
  ) {
    const url = queued.shift();
    if (visited.has(url) || new URL(url).origin !== origin) continue;
    visited.add(url);
    if (robots.isAllowed(url, "AIGrowthAudit") === false) {
      skipped++;
      continue;
    }
    if (/\.(pdf|jpg|png|gif|webp|zip|mp4|svg|css|js)(?:\?|$)/i.test(url))
      continue;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, Math.min(delay, deadline - Date.now()))),
    );
    await onProgress(`Checking page ${pages.length + 1} of up to 10`);
    try {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const response = await fetcher(url, {
        timeout: Math.min(30000, remaining),
      });
      if (new URL(response.url).origin !== origin) {
        skipped++;
        continue;
      }
      if (response.status >= 400) {
        failures.push({ url, status: response.status });
        continue;
      }
      if (!(response.headers["content-type"] || "").includes("text/html"))
        continue;
      if (pages.some((page) => page.url === response.url)) continue;
      const page = extractPage(response);
      pages.push(page);
      queued.push(...page.links);
    } catch {
      failures.push({ url, status: null });
    }
  }
  return {
    pages,
    failures,
    site: { robots: robotsResponse.status === 200, sitemap },
    coverage: {
      pagesCrawled: pages.length,
      pageLimit: 10,
      robotsSkipped: skipped,
      linksChecked: visited.size,
      limited: queued.length > 0,
      rendering: "server-html",
      externalLinksChecked: false,
      performanceMeasured: false,
    },
  };
}
