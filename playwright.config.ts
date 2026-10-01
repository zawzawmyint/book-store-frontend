import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node --import tsx ../frontend/e2e/server.ts',
      cwd: '../backend',
      url: 'http://localhost:4100/health',
      reuseExistingServer: false,
    },
    {
      command: 'bun run dev --host localhost --port 4173 --strictPort',
      url: 'http://localhost:4173',
      env: { VITE_API_TARGET: 'http://127.0.0.1:4100' },
      reuseExistingServer: false,
    },
  ],
})
