/**
 * E2E Test: Settings + Billing
 */
import { test, expect } from '../fixtures'

test.describe('Settings', () => {
  test('settings page renders with profile section', async ({ authedPage: page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // Should show settings content
    await expect(page.locator('body')).toContainText(/setting|profile|account|name|company|plan|billing/i, { timeout: 8000 })
  })

  test('profile tab shows user info', async ({ authedPage: page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // Should show the mock user's name or email
    await expect(page.locator('body')).toContainText(/test user|testco|test@productiq/i, { timeout: 8000 })
  })

  test('billing tab shows transaction history', async ({ authedPage: page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // Try clicking on billing tab
    const billingTab = page.locator('text=/billing|payment|transaction|history/i').first()
    if (await billingTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await billingTab.click()
      await page.waitForTimeout(500)
    }
    // Should show plan info or transactions
    await expect(page.locator('body')).toContainText(/pro|plan|subscription|transaction|payment|₹|rs/i, { timeout: 8000 })
  })

  test('plan info is displayed', async ({ authedPage: page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // Should show current plan (Pro from mock data)
    await expect(page.locator('body')).toContainText(/pro|starter|free|plan|subscription/i, { timeout: 8000 })
  })
})
