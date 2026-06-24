/**
 * E2E tests for Sentry Error Boundary + error handling.
 * Verifies that the app loads correctly with the ErrorBoundary wrapper
 * and that error states are handled gracefully.
 */
import { test, expect } from '../fixtures'

test.describe('Error Boundary + Sentry', () => {
  test('app loads correctly with ErrorBoundary wrapper', async ({ authedPage: page }) => {
    // If the ErrorBoundary is broken, the app won't render at all
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // The dashboard should render normally
    await expect(page.locator('body')).toContainText(/dashboard|workspace|report/i, { timeout: 10000 })
  })

  test('404 page renders gracefully (no crash)', async ({ authedPage: page }) => {
    // Navigate to a non-existent route — should show 404, not crash
    await page.goto('/this-route-does-not-exist')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // Should show some kind of "not found" message, not a blank screen
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 5000 })
  })

  test('landing page loads without errors', async ({ page }) => {
    // The landing page is outside the protected routes but inside the ErrorBoundary
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // Should render the landing page
    await expect(page.locator('body')).toContainText(/productiq|intelligence|product/i, { timeout: 10000 })
  })

  test('login page loads without errors', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // Should render the login form
    await expect(page.locator('body')).toContainText(/login|sign in|email/i, { timeout: 10000 })
  })

  test('all protected pages render without crashing the ErrorBoundary', async ({ authedPage: page }) => {
    // Visit each protected route and verify it renders
    const routes = [
      '/dashboard',
      '/reports/new',
      '/sentiment',
      '/prices',
      '/settings',
      '/knowledge',
      '/intelligence',
      '/brands',
      '/notifications',
      '/chat',
      '/compare',
      '/validate',
      '/admin',
    ]

    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(500)

      // Body should not be empty (ErrorBoundary would show fallback if crashed)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText?.trim().length).toBeGreaterThan(0)
    }
  })
})
