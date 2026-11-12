import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against a production build with its own throwaway database
// (PGlite on port 5434 in data/pglite-e2e, reset + seeded by e2e/seed.ts), so a
// run never touches the shared dev DB and works next to `npm run dev`.
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? 'github'
    : [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'desktop',
      testMatch: /\.desktop\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      // Same size as the mobile design boards.
      name: 'mobile',
      testMatch: /\.mobile\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'node e2e/serve.mjs',
    url: `${baseURL}/api/health`,
    timeout: 240_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    env: {
      E2E_PORT: String(port),
      DEV_DB_PORT: process.env.E2E_DB_PORT ?? '5434',
      DATABASE_PATH: 'data/pglite-e2e',
      BETTER_AUTH_URL: baseURL,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
