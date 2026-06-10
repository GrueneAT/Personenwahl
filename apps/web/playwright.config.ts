import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // _-prefixed specs are non-contract (screenshot generators); excluded from CI gate.
  // Note: Playwright applies testIgnore even to explicit-path runs, so to
  // regenerate visual screenshots locally, comment out this line temporarily
  // (or run with a separate config). Future option: move them under
  // tests/screenshots/ and ignore by directory.
  testIgnore: ['**/_*.spec.ts'],
  timeout: 30_000,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    // CI captures traces on failure for upload + post-mortem debugging.
    // Local runs skip this for speed; use `--trace=on` on CLI when needed.
    trace: process.env.CI ? 'retain-on-failure' : 'off',
  },
  webServer: {
    command: 'pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // vite base now defaults to '/' (custom-domain root); kept explicit so a
    // future base change does not silently break preview asset URLs.
    env: {
      VITE_BASE_PATH: '/',
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
