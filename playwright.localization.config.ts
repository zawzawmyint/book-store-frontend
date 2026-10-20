import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  testMatch: '**/localization-acceptance.spec.ts',
  testIgnore: [],
  // Native browser zoom must not inherit Desktop Chrome device emulation.
  projects: [{ name: 'localization', use: { browserName: 'chromium' } }],
  timeout: 180_000,
  outputDir: 'test-results/localization-acceptance',
})
