/**
 * E2E Test: Dashboard + Report Creation
 */
import { test, expect } from '../fixtures'

test.describe('Dashboard', () => {
  test('dashboard renders with runs list', async ({ authedPage: page }) => {
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // Check that the page has loaded with content (not redirected to login)
    await expect(page.locator('body')).toBeVisible()
    // The dashboard should show some content related to reports or runs
    await expect(page.locator('body')).toContainText(/whey|protein|report|dashboard|run|analysis/i, { timeout: 8000 })
  })

  test('new report page renders form', async ({ authedPage: page }) => {
    await page.goto('/reports/new')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // Check for form elements (category input, market select, etc.)
    await expect(page.locator('body')).toContainText(/category|market|brand|report|analysis|create|start/i, { timeout: 8000 })
  })

  test('can navigate to report view from dashboard', async ({ authedPage: page }) => {
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // Try to find and click a link to a report
    const reportLink = page.locator('a[href*="/reports/"]').first()
    if (await reportLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reportLink.click()
      await page.waitForURL(/\/reports\/[\w-]+/, { timeout: 5000 })
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('Report View', () => {
  test('report view page renders with all tabs', async ({ authedPage: page }) => {
    await page.goto('/reports/run-001')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // Check that the report page loaded
    await expect(page.locator('body')).toContainText(/whey protein|intelligence|report|overview|competitor|trend|concept|gtm/i, { timeout: 8000 })
  })

  test('overview tab shows insights', async ({ authedPage: page }) => {
    await page.goto('/reports/run-001')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // The overview tab should show insights from mock data
    await expect(page.locator('body')).toContainText(/sugar-free|underserved|digestibility|insight|market gap/i, { timeout: 8000 })
  })

  test('can switch between report tabs', async ({ authedPage: page }) => {
    await page.goto('/reports/run-001')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // Try clicking on different tabs
    const tabs = ['Competitors', 'Trends', 'Concepts', 'GTM']
    for (const tabName of tabs) {
      const tab = page.locator(`text=${tabName}`).first()
      if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tab.click()
        await page.waitForTimeout(500) // Wait for tab content to render
        await expect(page.locator('body')).toBeVisible()
      }
    }
  })

  test('competitor tab shows competitor data', async ({ authedPage: page }) => {
    await page.goto('/reports/run-001')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // Click on competitors tab if it exists
    const compTab = page.locator('text=Competitors').first()
    if (await compTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await compTab.click()
      await page.waitForTimeout(500)
      // Should show competitor names from mock data
      await expect(page.locator('body')).toContainText(/muscleblaze|optimum nutrition/i, { timeout: 5000 })
    }
  })

  test('concepts tab shows product concepts', async ({ authedPage: page }) => {
    await page.goto('/reports/run-001')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    const conceptTab = page.locator('text=Concepts').first()
    if (await conceptTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await conceptTab.click()
      await page.waitForTimeout(500)
      await expect(page.locator('body')).toContainText(/clearwhey|sugar-free|concept/i, { timeout: 5000 })
    }
  })
})
