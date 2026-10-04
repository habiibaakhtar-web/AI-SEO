# Development phases and feature checklist

Source: requirements.md, all 89 sections reviewed on 2026-10-01.
Current repository: working local React/Express/PostgreSQL/FastAPI product; live audits and responsive account workflows verified. External provider/deployment verification remains pending; see docs/validation.md.
Confirmed below means included in the requirements, not implemented or tested.

## Delivery rules

Build one phase at a time. Finish its acceptance checks, document evidence and remaining limitations, then move to the next phase. Do not expose future features as working functionality. Retain this checklist across sessions.

Use React, React Router, Axios, CSS and Lucide React; Node.js, Express, PostgreSQL, an ORM and JWT; Python, FastAPI, Pydantic and an LLM API. Keep frontend/, backend/, agent/ and docs/ separated. Select and document the ORM and LLM provider before integrating them.

Use measured crawler findings for scores and facts. AI explains those facts and proposes actions; it must never invent traffic, rankings, search volume or verified improvements. Persist audit results even if AI fails and identify unavailable recommendations clearly.

## Feature confirmation

All rows are confirmed requirements. The implementation checkpoint below records what works locally and what remains on the roadmap.

| Feature | Phase | Required behavior |
| --- | --- | --- |
| Authentication | 1 | Registration, login, logout, current user, forgot/reset password, profile/settings |
| Dashboard | 1 | Website summary, category scores, issue counts, recent audits, action plan and quick actions; historical charts in phase 3 |
| Website management | 1 | Add, edit, delete, details, last audit and current score; ownership checks |
| Website crawler | 1 | Bounded same-site crawl, URL normalization, duplicate prevention, timeouts, robots handling and explicit coverage |
| SEO audit | 1 | Persistent lifecycle, progress, results and friendly failure/retry behavior |
| Technical SEO | 1 | HTTPS, statuses, broken links, redirects, robots.txt, sitemap, canonical, viewport, titles/descriptions and duplicates, URLs, links and crawlability |
| On-page SEO | 1 | Titles, descriptions, H1/H2 and heading structure, image alt text, URLs, links, content length, keyword usage, readability and duplicate-content indicators |
| SEO score | 1 | Versioned measurable methodology, 0-100 overall and technical/on-page/content scores; unavailable checks distinguished from failures |
| SEO issues | 1 | ID, title, category, severity, description, why it matters, recommendation, page, status and timestamps |
| AI recommendations | 1 | Structured validated explanation and suggested fix tied to verified issues |
| SEO action plan | 1 | Prioritized tasks linked to findings; status updates do not rewrite measured audit scores |
| Audit history | 1 | Store and reopen every audit, including failures; comparisons in phase 3 |
| Keyword suggestions | 2 | Generate ideas using website/business context; distinguish suggestions from measured keyword metrics |
| Keyword management | 2 | Add/edit/remove, search/filter and organize by category, intent, priority, target page, status and notes |
| Content ideas | 2 | Topic, business, audience, keywords and intent; save and manage generated ideas |
| Content briefs | 2 | Title, primary/secondary keywords, intent, headings, questions, word range, internal links and goals |
| Meta title generator | 2 | Page topic, keyword, business and location input; character guidance |
| Meta description generator | 2 | Relevant description and character guidance |
| Internal linking suggestions | 2 | Existing source/target pages and suggested anchors, based on crawled content |
| AI SEO assistant | 2 | Chat with authorized website/audit context and validated responses |
| SEO progress tracking | 3 | Score history, improvements, remaining/resolved issues and completed tasks; comparable scoring versions |
| Scheduled audits | 3 | Background execution, schedule/timezone, retries and duplicate-run prevention |
| Notifications | 3 | Audit completion, critical findings, reminders, score changes, completed recommendations and scheduled audits |
| Advanced reports | 3 | Auditable summaries and comparisons; export format defined during this phase |
| Competitor analysis | 3 | Advanced measured comparisons of titles, headings, structure, topics and technical findings; label AI suggestions |
| Subscriptions | 4 | Free/Starter/Pro/Agency tiers, usage limits and billing; actual prices based on costs |
| Multiple websites | 4 | Multi-site access and selector; phase 1 data model remains user-to-websites while initial allowance is one site |
| Teams | 4 | Invitations, memberships, roles and tenant authorization |
| Agency mode | 4 | Client websites, agency dashboard, team access and white-label reports |
| Client management | 4 | Clients, associated sites and client dashboards |
| Search Console | 5 | Authorized integration and verified search metrics |
| Google Analytics | 5 | Authorized integration and verified traffic metrics |
| WordPress | 5 | Authorized integration; explicit scope for any site-changing actions |
| Shopify | 5 | Authorized integration; explicit scope for any site-changing actions |
| Google Business Profile | 5 | Optional integration from section 71; assess separately |
| Automated SEO agent | 6 | Continuous monitoring, new issue detection, AI recommendations and notifications |

## Roadmap reconciliations

- Section 72 includes audit history in the MVP; preserve it in phase 1, then add comparison/tracking in phase 3.
- Sections 72 and 84 differ on automation. Use the more specific six-phase roadmap in section 84, with integrations in phase 5 and autonomous monitoring in phase 6.
- Competitor analysis and internal linking are required but have no explicit phase assignment. Assign internal linking to phase 2 growth tools and competitor analysis to phase 3 advanced reports; these are planning assumptions.
- Authentication sections require reset password and profile update, but section 33 omits their routes. Include POST /api/auth/reset-password and PATCH /api/users/me alongside the documented routes.
- Keep why_it_matters on issues and notes on keywords even though example table field lists omit them. Persist crawled page evidence and scoring version so results remain explainable.
- Future routes such as /competitors should become available with their phase. Pricing on the landing page must describe planned tiers without fabricated prices or an operational checkout.

## Phase 1 execution order

1. Foundation: architecture, API contracts, schema/migrations, environment examples, secret exclusions, runnable service setup and design tokens.
2. Authentication: secure password hashing, JWT session handling/logout, reset flow, profile, input validation and sensitive endpoint rate limits.
3. Website management: validated URLs, owner-scoped CRUD, settings and empty states.
4. Crawler: public HTTP(S) targets only, private/local/reserved-address protection including redirects and DNS resolution, bounded pages/depth/body sizes/time, duplicate prevention and robots compliance.
5. SEO engine: deterministic checks, evidence records, coverage, documented versioned scoring and fixture-based tests.
6. Audit orchestration: asynchronous lifecycle, database persistence, polling/progress, issues, history, cancellation/failure behavior and retry policy.
7. Python recommendations: service authentication, grounded prompts, response schema validation, timeouts and AI-unavailable behavior.
8. Product UI: landing, authentication/settings, dashboard, websites, audit list/details, issue details and prioritized action plan using real API data.
9. Verification: end-to-end user workflow, security/error paths, responsive/accessibility checks and setup instructions.

Phase 1 is complete only when a user can register, log in, manage their website, run an audit, inspect measured scores and issues, understand why they matter, receive validated recommendations, update task status, and reopen saved history. Verify cross-user denial, invalid URLs, blocked/failed crawls, unavailable AI/database, rate limits and invalid AI output. Do not claim a phase complete without recorded evidence.

## Later phase completion criteria

- Phase 2: persist keywords and content; generate validated ideas, briefs and metadata; recommend actual internal pages; assistant respects account context and handles provider failure.
- Phase 3: compare saved audits accurately, run scheduled jobs reliably, deliver authorized notifications and reports, and separate competitor measurements from AI interpretation.
- Phase 4: enforce billing/usage and tenant permissions across sites, teams and clients; test billing failure and unauthorized tenant access.
- Phase 5: test consent, token protection, revocation, unavailable providers and data freshness for each integration. Core product stays usable without integrations.
- Phase 6: monitor reliably without duplicate jobs or alerts; preserve measured evidence and validate recommendations. Automatic website editing is outside the described monitoring scope.

## Design and skill workflow

Read the corresponding .agents/skills/<name>/SKILL.md before applying it. These are local skills, not independent agent processes.

| Skill | When applied |
| --- | --- |
| token-efficient-coding | File mapping, bounded reads/logs, focused edits and validation throughout |
| ui-ux-design | User flows, hierarchy, navigation and loading/empty/error/success states |
| design-system | Shared semantic color tokens, typography, spacing and reusable components |
| responsive-design | Dashboard/navigation/table adaptation across viewport sizes and zoom |
| accessibility-review | Forms, dialogs, keyboard/focus, contrast and asynchronous announcements |
| motion-ui | Subtle feedback/transitions; CSS for simple effects, Motion only when justified; reduced motion |
| visual-qa | Rendered desktop/mobile checks, interactions, console/network checks and screenshots |

Exact palette: background #FCF9EA, primary accent #DB9558, secondary #97A87A, supporting #A8BBA3. Use a readable neutral foreground with tested contrast; avoid white text on pale accents without checking it. Choose Inter initially. Use calm spacing, restrained rounded corners, minimal shadows and clear information hierarchy. Avoid decorative dots/lines, floating shapes, particles, excessive gradients/glass, 3D and distracting motion.

Every applicable screen covers loading, empty, error, disabled, success and destructive states. Validate representative mobile, tablet, desktop and wide layouts, long URLs, keyboard interaction and 200% zoom. Every issue answers: what is wrong, why it matters, what to do.

## Cross-phase engineering requirements

- Modular services/controllers/routes/schemas and reusable frontend components; follow documented JS/React/Python naming.
- Consistent API success/message/data envelopes and safe error responses.
- Environment variables for ports, database, JWT, agent URL and LLM configuration; no committed secrets or secret logging.
- Pagination, sensible caching, bounded crawling and asynchronous long-running work.
- Automated tests for authentication, authorization, validation, deterministic analysis and AI schema behavior; frontend form/API states and browser workflow checks as applicable.
- Safe logs for audit start, crawl completion, analysis, AI processing and persistence.
- Document architecture, API contracts, scoring methodology, development setup and validation evidence.

## Current progress

- [x] Read all 89 requirement sections.
- [x] Inspect workspace and all seven local skill instructions.
- [x] Confirm every main feature and identify roadmap differences.
- [x] Define phase sequence and acceptance criteria.
- [x] Implement phase 1 foundation; migrations verified on persistent embedded PostgreSQL.
- [x] Implement and verify local phase 1 core: authentication, websites, crawler, deterministic checks/scores, issues/tasks, rule recommendations and saved history.
- [ ] Verify a live AI provider, external PostgreSQL deployment and production reset-email delivery before claiming full production phase 1 completion.
- [ ] Complete phase 2.
- [ ] Complete phase 3.
- [ ] Complete phase 4.
- [ ] Complete phase 5.
- [ ] Complete phase 6.

## Working implementation checkpoint ? 2026-10-02

Phase 2 tools are implemented locally: keyword generation/CRUD/search/filter/organization, content ideas/briefs/meta drafts and saved outputs, internal-link heuristics, and an audit-context assistant. AI-provider calls are implemented and schema tested; live generation requires provider credentials. Rule-based mode is explicitly labeled. Full phase 2 remains unchecked until provider behavior is verified.

Measured progress comparisons and multiple local websites are also usable. This reflects the request for a working full-stack product, not completion of the later subscription/agency/tracking phases. Scheduled jobs, notifications, competitor analysis, billing, teams, client management, integrations and continuous monitoring remain pending.

All 15 backend, 10 Python and 14 browser scenarios passed. See validation.md and scoring.md for evidence and practical limits.

## Provider configuration checkpoint - 2026-10-02

OpenRouter setup, server-side provider status, a rate-limited Settings connection check, and SMTP password-reset delivery are implemented. The agent/.env file is prepared with a blank key. Verification now passes 16 backend, 17 Python, and 14 browser scenarios plus the production build. Live AI, actual email delivery, and external PostgreSQL deployment still require credentials and verification. The remaining phases above are still pending; this checkpoint does not claim completion of all six phases.