# Deploy the SEO app on Hostinger Unlimited using a temporary domain

This version runs React, Express, MySQL and direct AI-provider calls in one Node.js Web App. No Python service, PostgreSQL server, Redis, Docker, paid domain, or separate worker is required in production. Node 24 is recommended; Node 22.12+ is also supported.

## 1. Create a new Web App

In Hostinger hPanel open Websites, Add website/Create website, then Node.js/Web App. Use a NEW app for the SEO project. Choose the included temporary hostingersite.com domain when offered; leave any existing LMS and other websites alone. Do not purchase a domain for this test.

Upload hostinger-deploy.zip (its root contains package.json and server.js), or connect this project's GitHub repository. Select Express, repository root `.`, npm, Node 24, entry file `server.js`. Use `npm run build` if a build command is shown and `npm start` if a start command is shown. Keep the Express output/root default; do not choose a static Vite deployment. The postinstall hook also builds the frontend, including when production dependencies only are installed.

Copy the exact assigned HTTPS temporary URL. Set FRONTEND_ORIGIN to this origin without a trailing slash. The first deployment may fail until the database variables below are added; save the app, add them and redeploy. Do not reuse the example domain from an older setup.

## 2. Create a separate MySQL database

Under the hosting plan's Databases / Management create a NEW database and database user for the SEO test app. Keep the full prefixed database name, username and password private. Use the database host supplied by hPanel (usually 127.0.0.1) and port 3306.

This new app starts with a fresh database. Tables are created automatically on startup. Do not import the LMS SQL export or replace another site's database. Register a new SEO account after deployment. Old local embedded PostgreSQL data is retained locally and is not automatically imported into MySQL.

## 3. Set private environment variables

Use hostinger.env.example as a checklist and enter the values in the Web App's Environment Variables settings:

- NODE_ENV=production
- HOST=0.0.0.0
- FRONTEND_ORIGIN=https://THE-ACTUAL-ASSIGNED-NAME.hostingersite.com
- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD from the new database
- JWT_SECRET: a new random secret of at least 32 characters

Generate JWT_SECRET locally: `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. Keep the result private. Use Hostinger's assigned PORT; do not set your local port. Leave VITE_API_URL unset; `/api` is correct.

For AI, put LLM_API_KEY, LLM_MODEL, LLM_API_URL and optionally LLM_MAX_TOKENS in hPanel. Existing local agent/.env LLM settings are read by the local launcher for compatibility, but agent/.env is NOT included in deployment. Do not put keys in frontend variables. START_LOCAL_AGENT, AGENT_URL, AGENT_SERVICE_TOKEN, DATABASE_URL and DATABASE_SSL are unnecessary on this deployment.

SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and MAIL_FROM enable password reset email. Without SMTP, production password reset returns an unavailable message; login and profile password changes still work.

## 4. Deploy and verify

Redeploy with the environment settings saved. Open the temporary HTTPS domain and confirm:

1. `/api/health` and `/api/ready` respond successfully.
2. Register, log in, refresh, log out and log back in.
3. Add a public website, run an audit and keep its details page open. Check saved results, keywords, drafts and account ownership.
4. Test the AI connection only when you are ready to make a small paid provider request. Rule guidance works without a key.
5. Redeploy once and verify saved accounts and audit results still exist in MySQL.

A POST origin error means FRONTEND_ORIGIN does not exactly match the browser's HTTPS origin. A successful frontend build alone does not confirm database or runtime health: check the runtime logs and readiness route too.

## Audit processing and plan limits

Audits are queued durably in MySQL and processed by authenticated POST requests from the audit details page. There is no endless background queue. Each process runs one audit at a time. Crawling has a 55-second budget, AI calls time out after 25 seconds, and database work checks a 95-second execution budget, leaving room under Hostinger's 120-second request limit. The browser allows 110 seconds for the processing call and polls progress separately. Availability and speed still depend on hosting/database/network load.

A two-minute database lease prevents duplicate processing of one audit across requests. If a server restarts, reopening the details page automatically retries after the lease expires, clears partial results and rebuilds that audit. Queued audits need the details page open to start/resume. Existing completed audits are retained.

Hostinger Business/Unlimited currently lists 5 Node.js websites, sharing memory/process resources. This test app uses one slot. Avoid heavy simultaneous crawls. Back up the SEO database through Hostinger/phpMyAdmin.

Official limits: https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/

## Build the upload again

Run `npm ci`, then `npm run build:hostinger`. This writes a generated `hostinger/` folder with source, package manifests and built assets only. Zip its CONTENTS as hostinger-deploy.zip, so package.json is at the archive root. It intentionally excludes .env files, agent code, local databases, node_modules and backups.
