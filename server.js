import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = fileURLToPath(new URL('./', import.meta.url));
dotenv.config({ path: resolve(root, '.env'), quiet: true });
dotenv.config({ path: resolve(root, 'backend/.env'), quiet: true });

// npm run dev retains the local Vite workflow unless production is requested.
if (process.argv.includes('--dev') && process.env.NODE_ENV !== 'production') {
  await import('./scripts/dev.js');
} else {
  process.env.NODE_ENV = 'production';
  process.env.HOST ||= '0.0.0.0';
  if (!existsSync(resolve(root, 'frontend/dist/index.html'))) {
    throw new Error('Frontend build is missing. Run npm run build before starting the server.');
  }
  // Validate production credentials before starting a child service.
  const { parseEnvironment } = await import('./backend/src/config/environment.js');
  parseEnvironment();
  let agent;
  if (process.env.START_LOCAL_AGENT === 'true') {
    if (!process.env.AGENT_SERVICE_TOKEN) throw new Error('START_LOCAL_AGENT requires AGENT_SERVICE_TOKEN.');
    const port = Number(process.env.AGENT_PORT || 8000);
    if (!Number.isInteger(port) || port < 1 || port > 65535 || port === Number(process.env.PORT || 5000)) {
      throw new Error('AGENT_PORT must be a valid port different from PORT.');
    }
    process.env.AGENT_URL = `http://127.0.0.1:${port}`;
    const localPython = resolve(root, process.platform === 'win32' ? 'agent/.venv/Scripts/python.exe' : 'agent/.venv/bin/python');
    const python = process.env.PYTHON_EXECUTABLE || (existsSync(localPython) ? localPython : 'python3');
    agent = spawn(python, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(port)], {
      cwd: resolve(root, 'agent'), stdio: 'inherit', env: process.env, windowsHide: true,
    });
    agent.on('error', () => {
      console.error('Python agent could not start. Install Python and agent requirements, or host the agent separately.');
      process.kill(process.pid, 'SIGTERM');
      process.exitCode = 1;
    });
    agent.on('exit', code => {
      if (code) console.error('Python agent exited. Check its logs; AI requests will use rule-based fallback.');
    });
    process.on('SIGINT', () => agent.kill('SIGTERM'));
    process.on('SIGTERM', () => agent.kill('SIGTERM'));
    process.on('exit', () => agent.kill('SIGTERM'));
  }
  process.chdir(resolve(root, 'backend'));
  try {
    await import('./backend/src/server.js');
  } catch (error) {
    agent?.kill('SIGTERM');
    throw error;
  }
}
