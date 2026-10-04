# Working product architecture

React/Vite -> Express -> PostgreSQL. Express -> authenticated FastAPI -> configurable LLM provider.

## Running locally

npm run dev starts React on 5173, Express on 5000 and the Python service on 8000. Shared private service credentials are generated locally if absent. The browser uses a same-origin /api proxy, not direct access to the Python service.

The development database is PGlite, a real file-backed embedded PostgreSQL engine. This allows immediate operation without database credentials or executing installed native PostgreSQL tools. Production requires DATABASE_URL and uses Sequelize/pg to run parameterized SQL on a PostgreSQL server. This is documented in [PGlite's filesystem API](https://pglite.dev/docs/filesystems).

## Database and migrations

Versioned SQL migrations in backend/src/db/migrations are applied on startup and recorded in app_migrations. There is no runtime ORM schema synchronization.

users -> websites -> audits -> crawled_pages / seo_issues / recommendations.
Sessions and password resets belong to users. Keywords and saved content belong to websites.

The existing Sequelize model definitions remain available, while the product service repository uses parameterized SQL uniformly across the embedded and external database drivers. The SQL migration constraints are authoritative for all product fields.

Audits keep the original target URL, scoring version, measured page evidence, issue explanations and coverage. Recommendations reference issues within the same audit. One active audit per site is enforced by a partial unique index. Scores remain absent before analysis; changing a task's status does not change its measured score.

## Security

Passwords use salted scrypt. HS256 JWTs are stored in HttpOnly SameSite=Lax cookies and checked against persistent, revocable sessions. Production cookies require HTTPS. Password resets use one-time hashed tokens with a 30-minute lifetime, and reset/password changes revoke sessions as appropriate.

Routes enforce ownership through the website owner join. Unsafe requests validate browser Origin; input schemas and bounded body sizes reject malformed payloads. Authentication and draft endpoints are rate-limited. Secrets and database files are ignored by Git.

Crawler URLs only allow HTTP(S), normal ports and no credentials. Address validation denies nonpublic ranges, including IPv4-mapped IPv6. DNS is checked and pinned to the connection; each redirect is revalidated. Requests, bytes, pages and redirects are bounded. robots.txt rules and crawl delays are respected.

## Audit lifecycle

POST /api/audits persists a queued job and returns 202. A single-process worker takes queued audits, crawls, applies deterministic checks, saves findings, then requests AI explanations. Missing/invalid AI output gets explicitly labeled rule-based recommendations. Failures are retained with friendly messages.

Queued jobs resume after restart. Previously running jobs are marked interrupted and can be rerun. This worker is intended for one backend instance; horizontal scaling requires a separate durable worker/queue and distributed claiming.

## AI and growth tools

FastAPI validates private service authentication and sends configurable chat-completions-compatible provider requests. It validates structured recommendation completeness, issue IDs, severity and response sizes. No paid-provider call has been verified without keys. React renders all output as plain text.

Keyword and content tools use AI when configured; otherwise they provide labeled rules/templates. The local assistant summarizes verified audit findings. Internal links use shared words in saved titles/headings and exclude links already present. Scores compare measured audit history only; differing targets or score versions are flagged.

## Production and remaining roadmap

Build frontend assets, set NODE_ENV=production with PostgreSQL, secrets and FRONTEND_ORIGIN, then run npm start. Express serves both the compiled SPA and API. Configure TLS/proxy behavior and launch Python separately when using AI.

Production password-reset email delivery is not integrated; its API returns unavailable instead of exposing reset tokens. Scheduled audits, notifications, subscriptions, agencies, competitor analysis and external integrations are future work. See validation.md for what was actually tested.
