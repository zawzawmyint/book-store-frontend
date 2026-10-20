import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  testMatch: '**/notification-accessibility.spec.ts',
  testIgnore: [],
  // Native zoom must not inherit Desktop Chrome device emulation.
  projects: [{ name: 'notification-acceptance', use: { browserName: 'chromium' } }],
  timeout: 120_000,
  outputDir: 'test-results/notification-acceptance',
})
