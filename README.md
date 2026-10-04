# AI SEO & Website Growth Agent

A working local full-stack application with React, Express, PostgreSQL and a Python AI service.

## Open the product

Dependencies are installed in this workspace. From the root:

```powershell
cd D:\IT_HUB_INTERNSHIP\AI_SEO_WEBSITE
npm run dev
```

Open **http://127.0.0.1:5173**. This one command starts the frontend, backend and Python service. Keep the terminal open; Ctrl+C stops them.

Create your own account, add a public website, and click **Run SEO audit**. Results are saved automatically. No demo login or fabricated audit data is used in the workspace.

The launcher can reuse this project?s existing frontend on port 5173. If API/agent ports 5000 or 8000 are already in use by an older terminal, stop that terminal first. Running only dev:frontend provides the UI without starting the services; use npm run dev for the full application.

## Working capabilities

- Registration, login/logout, persistent revocable sessions, profile and password changes.
- Website creation/edit/delete and owner-scoped access.
- Real bounded public-website crawler with robots rules and private-network protection.
- Measured technical/on-page/content checks, versioned scores and explicit crawl coverage.
- Prioritized issues, explanations, action guidance, task status changes, saved audit history and score comparisons.
- Keyword ideas, management, categories, priorities, target pages, intent, notes, search and filtering.
- Content ideas, briefs, metadata drafts and audit-context assistant; saved drafts and copy.
- Heuristic internal-link suggestions from measured pages.
- Responsive mobile/desktop workspace using the exact cream, gold and green palette.

## Database

Local development uses **PGlite**, a real embedded PostgreSQL engine, with data persisted under backend/.data/postgres. The local session secret is persisted in backend/.data/local-secret. These files are ignored by Git. Do not delete .data if you want to retain your accounts and audits. One backend process should own a local data directory.

For a PostgreSQL server, copy backend/.env.example to backend/.env and set DATABASE_URL. The backend uses Sequelize's PostgreSQL connection and parameterized queries. Versioned SQL migrations run on startup. Database commands (stop the backend before using these with the embedded data directory):

```powershell
npm run db:migrate
npm run db:status
```

No credentials are required for the embedded local database. External PostgreSQL deployment has not been tested here because an authorized connection URL was not supplied.

## AI provider

Without an API key, the application works with **clearly labeled rule-based recommendations and draft templates**. The local assistant summarizes measured audit findings. It does not pretend to be a live language model.

**Yes, OpenRouter is supported.** Put its key in `agent/.env`, never `frontend/.env.example`. The local configuration file is ready; fill in the blank key:

```dotenv
LLM_API_KEY=your_openrouter_key
LLM_MODEL=openrouter/auto
LLM_API_URL=https://openrouter.ai/api/v1/chat/completions
```

Create a key at https://openrouter.ai/settings/keys. Restart `npm run dev`, sign in, open **Settings**, and click **Test AI connection**. This makes a small provider request and may use credits. See [OpenRouter setup](docs/openrouter.md) for model selection and troubleshooting.

For another compatible provider, set:
- LLM_API_KEY: your provider key.
- LLM_MODEL: your provider model.
- LLM_API_URL: the provider's chat-completions endpoint, supporting messages and JSON-object responses.

The Python service uses a configurable chat-completions-compatible HTTP API. The root dev launcher automatically shares the private service token. For separately launched services, set matching AGENT_SERVICE_TOKEN values in backend/.env and agent/.env. Restart after configuration changes. Never put provider keys in frontend environment variables or commit .env files.

Provider requests time out and validate response shape, issue IDs and severity. Invalid/unavailable provider results fall back to labeled rule guidance. Live paid-provider generation has not been verified without credentials.

## Password reset

Local development without SMTP returns a 30-minute reset link on the forgot-password page. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `MAIL_FROM` in `backend/.env` to send reset links by email. Port 465 uses TLS; other ports require STARTTLS. Production requires SMTP and never exposes reset tokens in API responses. Actual delivery requires your mail provider credentials. Profile password changes work in both modes.

## Fresh installation

Node.js 22.12+, Python 3.11+:

```powershell
npm ci
python -m venv agent/.venv
agent/.venv/Scripts/python -m pip install -r agent/requirements-lock.txt
npm run dev
```

Python is optional for rule-based local operation; the launcher reports if its environment is missing. Production assets:
```powershell
npm run build
```

For production, configure backend NODE_ENV=production, DATABASE_URL, JWT_SECRET (at least 32 characters), FRONTEND_ORIGIN and HTTPS. Set HOST appropriately for your deployment. Run npm start to serve the compiled frontend and API from Express. Run the Python service separately with matching private service token if using AI. Embedded storage is disabled in production. The development launcher is intended for local use.

## Verification

Crawler requests allow up to 30 seconds per redirect hop and can fall back to other public DNS addresses when a connection fails. The initial page and robots.txt get one retry for temporary connection failures within the crawl budget. Audits still respect robots.txt and cannot bypass sites that block automated access. To check a website's connectivity without running an audit:

```powershell
node scripts/check-crawl.js https://example.com/
# Check the complete crawler, including robots rules and linked pages:
node scripts/check-crawl.js --audit https://example.com/
```

```powershell
npm test
npm run build
Set-Location agent
.venv/Scripts/python -m pytest -q
Set-Location ..
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm run test:ui -- --workers=2
```

Installed Chrome is used here because the bundled Chromium download timed out. Alternatively install the Playwright browser with npx playwright install chromium and omit PLAYWRIGHT_CHANNEL. Live-crawl UI tests need access to https://example.com.

## Product limits and roadmap

Crawls inspect up to 10 server-rendered HTML pages, not all pages or JavaScript-rendered content. Scores are heuristic health indicators, not ranking guarantees. External destinations, traffic and Core Web Vitals are not measured. Readability and keyword occurrence counts are informational. Review AI/template drafts before publishing.

Scheduled audits, notifications, billing, teams/agency features, competitor comparisons and third-party integrations remain future roadmap items. They are not presented as working product features.

See [architecture](docs/architecture.md), [API](docs/api.md), [scoring](docs/scoring.md), [validation](docs/validation.md), [roadmap](docs/development-phases.md), and the original [requirements](requirements.md).
