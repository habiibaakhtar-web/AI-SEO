# Hostinger deployment

Use Node.js Web App hosting with the repository root as the application root.
Set the build command to `npm run build`, the entry file to `server.js`, and
the start command (if offered) to `npm start`. Do not deploy this as a static
directory: the Express server serves both `frontend/dist` and `/api`.

Set these private variables in hPanel, not in frontend files:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
FRONTEND_ORIGIN=https://gold-whale-204729.hostingersite.com
DATABASE_URL=YOUR_NEON_POSTGRESQL_CONNECTION_STRING
DATABASE_SSL=true
JWT_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
```

Use the platform-assigned PORT. Leave VITE_API_URL unset so the frontend uses
the same server's `/api`. Remove any old frontend API URL and rebuild.
Production requires hosted PostgreSQL; local embedded data is not copied.

## Python agent

Hostinger managed Node hosting does not guarantee Python application support.
On that hosting, deploy the Python agent separately and set AGENT_URL and
AGENT_SERVICE_TOKEN on the Node app. Set the same token and the LLM variables
from agent/.env.example on the Python host. Without an agent, rule-based tools
remain available.

On a VPS with Python installed, install the agent dependencies first:

```sh
python3 -m venv agent/.venv
agent/.venv/bin/python -m pip install -r agent/requirements-lock.txt
```

Then set START_LOCAL_AGENT=true and AGENT_SERVICE_TOKEN to a private random
value. Configure LLM_API_KEY, LLM_MODEL, LLM_API_URL, and APP_URL in the hosting
environment or agent/.env. AGENT_PORT defaults to 8000; PYTHON_EXECUTABLE can
override the Python executable path. The agent binds only to localhost.

`npm run dev` starts Vite, Express, and the installed Python virtual environment
locally. With NODE_ENV=production, the same command starts Express serving the
built frontend and starts Python when START_LOCAL_AGENT=true. Build once with
`npm run build` first. `npm start` always uses production mode.

## Verification

After pushing changes and redeploying, visit `/api/health`, `/api/ready`, `/`,
and a frontend route. Register and log in. Database migrations run on startup.
Password reset email requires SMTP configuration as described in README.md.

A 403 on a POST saying "This request origin is not allowed" means
FRONTEND_ORIGIN does not match the browser's exact HTTPS origin. A hosting
403 on the homepage requires checking hPanel's Node entry file and routing;
successful build logs alone do not confirm that the application is running.
