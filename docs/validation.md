# Working product validation

Validated 2026-10-02 (Asia/Karachi).

## Completed checks

- Backend: 15 tests passed. Tests run SQL migrations on actual embedded PostgreSQL, including constraints and queries; account/session/password-reset workflow; cross-user website/audit/issue/keyword/content denial; CSRF Origin denial; website edits preserving historical audit targets; seeded audit processing and recommendations; keyword generation/editing; SSRF URL guards; repeatable scoring; measured linking suggestions.
- File-backed database test closed/reopened a database and retained its records and all migration versions.
- Python: 10 tests passed. Includes service authentication, unavailable provider handling and simulated provider responses rejected/accepted by grounded schema validation.
- React production build passed.
- Browser: all 14 final desktop/mobile scenarios passed against the running full-stack application, including keyword create/edit/generation, live crawling, issue persistence, content, profile and login/logout workflows. A general-rate-limit failure during rapid tests was corrected; authentication/generation limits remain separate.
- Live public fetch and crawl of https://example.com succeeded. Scores/issues came from its fetched HTML, not hardcoded demo values.
- Actual browser workflows registered accounts, saved websites, ran public crawls, saw scores, updated task status, reloaded persistent results, saved/read content, changed profiles and logged out/in.
- Accessibility scans on landing, registration, website and audit views found no WCAG A/AA violations in tested states.
- Layout overflow checks covered 320, 390, 768, 1024, 1440 and 1920 pixels; reduced-motion and 200% text-size checks passed on the landing. Desktop/mobile workspace screenshots were inspected.
- Installed Chrome is used through PLAYWRIGHT_CHANNEL=chrome; bundled Chromium download previously timed out.
- npm dependency installation audit reported 0 vulnerabilities.

## Actual limits

Embedded PostgreSQL was tested, including persistence. External PostgreSQL/Sequelize connection mode was not exercised without an authorized DATABASE_URL. Previously installed native initdb was blocked by Windows Application Control; no native database configuration was altered.

No paid LLM credentials were provided. The Python provider boundary and validation were tested with simulated responses; live provider generation remains unverified. The application works with labeled rule-based recommendations/templates and a local contextual audit summary.

Production password reset uses the implemented SMTP adapter and needs mail-provider credentials; production never returns reset tokens. Local development reset links work and expire after 30 minutes. The app has not been deployed or load tested. The job runner supports one backend process.

Audits sample up to 10 server-HTML pages, with visible coverage. Search traffic/rankings, JavaScript rendering, external-link destination checking and Core Web Vitals are not implemented. Readability/keyword phrase counts and link suggestions are explicitly informational heuristics. Roadmap features remain pending.

## Final runtime smoke checks

The one-command launcher started the API and Python service and reused the already-running project frontend. The frontend API proxy and database readiness returned 200. Python liveness returned 200 and provider readiness correctly returned 503 without credentials. All three SQL migrations are recorded with no pending migrations. The production SPA/API serving path was checked separately. The app is running locally on http://127.0.0.1:5173.

## OpenRouter and SMTP checkpoint - 2026-10-02

- 16 backend tests passed, including production reset email behavior with a simulated SMTP adapter, hidden reset tokens, one-time use, session revocation, and invalidation after delivery failure.
- 17 Python tests passed, including OpenRouter bearer headers, JSON-compatible provider routing, safe errors for invalid keys/credits/rate limits, invalid JSON rejection, and authenticated connection checks.
- Frontend production build passed.
- 14 desktop/mobile browser scenarios passed on isolated ports 5174/5001, including the Settings AI connection error state. Browser tests intentionally disable live provider access to avoid spending credits.
- OpenRouter live requests and actual SMTP delivery remain unverified until credentials are configured. No provider key was supplied or fabricated.