import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration
 *
 * Tests use MSW (Mock Service Worker) to intercept API calls,
 * so they can run in CI without a backend or Supabase instance.
 *
 * For local testing against a real stack:
 *   1. Start the backend: cd productiq-backend && uvicorn main:app
 *   2. Start the frontend: cd productiq-frontend && npm run dev
 *   3. Run: npx playwright test --use-base-url=http://localhost:5173
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    // Use the Vite preview server (build output)
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start the Vite preview server automatically
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Use test env vars for the build (mock Supabase credentials)
      VITE_API_URL: '/api',
      VITE_SUPABASE_URL: 'https://placeholder.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'placeholder-anon-key',
      // E2E test mode: bypass Supabase auth with mock user
      VITE_E2E_TEST: 'true',
    },
  },
})
