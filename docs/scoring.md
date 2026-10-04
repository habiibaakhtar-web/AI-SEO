# Measured SEO score, version 1.1.0

This score measures this application's finite crawl checks. It is not a search-ranking prediction, a Google score, or a complete SEO assessment.

For each category:
score = round(100 * sum(weights of passed applicable checks) / sum(weights of all applicable checks)).

Overall = round(technical * 0.4 + on-page * 0.4 + content * 0.2).

Category scores stay NULL until analysis. Task statuses never alter stored scores. A new audit is required to verify a fix. Version 1.1.0 adds redirect-chain checking to version 1.0.0; the website progress view flags differing versions or changed targets.

## Checks and weights

- Technical: HTTPS (2), canonical present (1), mobile viewport present (2), no noindex directive (2), request follows at most one redirect (1). Site-level robots file (1) and readable XML sitemap (1) are checked once. Known HTTP errors on sampled internal destinations each add a failed technical check (2).
- On-page: nonempty title (2), title 15-65 characters (1, only if present), description present (1), description 70-160 characters (1, only if present), one main H1 (1), no heading level jump greater than one (1), all images have an alt attribute (1, only when images exist), URL path at most 100 characters (1), unique title (1, only when present), unique description (1, only when present).
- Content: at least 150 extracted words (1), at least one link to another internal page (1), no identical extracted content among pages longer than 50 words (1).

These are editorial and technical heuristics. H1, word-count and character-length guidance is contextual; passing a threshold does not guarantee rankings or snippet display. Noindex can be intentional, so issues can be ignored after review. robots.txt absence is guidance, not a claim that a site is blocked.

## Evidence and coverage

Audits save the original target URL, score version, page observations, issues and coverage. Crawling is bounded to 10 HTML pages and 25 attempted unique destinations, with a 90-second loop budget, 8-second individual requests, up to 5 validated redirects, 2 MB response limit, and robots-aware delays. Individual requests/redirects and initial metadata fetches can extend total time beyond the loop budget. The queue is processed asynchronously.

Text removes script, style, noscript, navigation and footer copy before word counts. Headings, image attributes and links are extracted from the original server HTML. External links are recorded, not fetched.

Keyword phrase matches are case-insensitive substring counts for up to 20 saved target keywords; no search-volume/ranking claims are made. Approximate English Flesch reading ease is calculated only for pages explicitly labeled English and longer than 50 words, using a simple syllable estimator. Both are informational and excluded from the score.

Internal linking suggestions use shared nontrivial words in saved page titles/headings and exclude existing source-to-target links. They are reviewable heuristic suggestions, not confirmed semantic relevance.

Unavailable requests are recorded separately; an unknown HTTP status is not penalized as a verified broken link. Partial crawls, robots skips and failed requests appear in coverage. JavaScript rendering, Core Web Vitals, traffic, search rankings and competitor metrics are outside this audit.

