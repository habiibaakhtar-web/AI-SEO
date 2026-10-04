import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure', ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    { command: 'npm run dev:backend', url: 'http://127.0.0.1:5001/api/health', reuseExistingServer: false, timeout: 60000, env: { PORT:'5001',DATA_DIR:'.data/browser-tests',FRONTEND_ORIGIN:'http://127.0.0.1:5174',AGENT_URL:'http://127.0.0.1:8099' } },
    { command: 'npm run dev:frontend', url: 'http://127.0.0.1:5174', reuseExistingServer: false, env: { FRONTEND_PORT:'5174',API_PROXY_TARGET:'http://127.0.0.1:5001' } },
  ],
});

