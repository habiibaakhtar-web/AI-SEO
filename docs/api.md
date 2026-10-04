# Working API

All Node responses use success/message/data envelopes; errors omit data. Private routes use the HttpOnly session cookie. Cross-account objects return 404.

## Service status

- GET /api/health: backend liveness.
- GET /api/ready: checks the database and migrated users table.
- Python GET /health, /ready and /docs: liveness, provider configuration and schema docs. Readiness indicates configured settings, not a verified provider network request.

## Accounts

- POST /api/auth/register: name, email, password (10-128 characters).
- POST /api/auth/login: email, password.
- POST /api/auth/logout; GET /api/auth/me.
- POST /api/auth/forgot-password: email. Development returns a local resetUrl; production returns 503 until mail delivery is configured.
- POST /api/auth/reset-password: token, password.
- PATCH /api/users/me: name.
- POST /api/users/me/password: currentPassword, password.

## Websites and audits

- GET/POST /api/websites; GET/PUT/DELETE /api/websites/:id.
- Website input: name, public url and optional description.
- POST /api/audits: websiteId. Returns 202 and a saved audit ID.
- GET /api/audits: page (50 per page), optional websiteId.
- GET /api/audits/:id: scores, status, coverage, pages, issues and recommendations.
- GET /api/audits/:id/issues.
- PATCH /api/issues/:id/status: open, in_progress, resolved, ignored.
- GET /api/websites/:id/links: heuristic opportunities from the latest completed audit.

Create a new audit instead of overwriting historical results. An active site cannot be edited/deleted until its audit finishes. The UI polls active jobs. Up to 10 sites per local account and 10 audits/hour are currently allowed.

## Growth tools

- GET /api/keywords?websiteId=UUID.
- POST /api/keywords: websiteId, keyword, optional intent/notes.
- PUT /api/keywords/:id: keyword, category, intent, priority, targetPage, status, notes.
- DELETE /api/keywords/:id.
- POST /api/keywords/generate: websiteId, topic; returns suggestions and ai/rule source.
- GET /api/content?websiteId=UUID.
- POST /api/content/:kind: ideas, brief, meta, assistant.
- Content input: websiteId, topic and optional keyword/business/location.
- Content output: saved ID, kind, input, output.text, ai/rule source and date.

## Private agent

- GET /api/ai/status: authenticated, safe provider/model configuration status.
- POST /api/ai/test: authenticated connection check; limited to three per user per minute. Makes a small model request and returns safe configuration errors.
- POST /provider/status and /provider/test: private agent counterparts, require X-Service-Token.

- POST /seo/recommendations: audit_id and verified issues; returns validated recommendations.
- POST /content/generate: kind and context; returns validated plain text.
- X-Service-Token is required. The browser never calls these endpoints.

Provider failures fall back to clearly identified rules/templates in the backend. Raw provider errors, credentials and password hashes are never sent to the browser.
