import { defineConfig } from '@playwright/test';

/**
 * End-to-end smoke suite (e2e/). It builds nothing: run `pnpm build` first, then
 * `pnpm test:e2e`. A tiny static server (e2e/serve.mjs) serves apps/web/dist with the
 * Cloudflare rules (trailing-slash redirect, nearest 404.html with status 404).
 * Chromium only, at the two sizes the design is judged at: desktop and phone.
 * E2E_PORT and E2E_DIST change the port and the build folder.
 */
const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 60_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node e2e/serve.mjs',
    url: `${baseURL}/`,
    reuseExistingServer: !process.env.CI,
    env: { E2E_PORT: String(port) },
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    {
      name: 'phone',
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
