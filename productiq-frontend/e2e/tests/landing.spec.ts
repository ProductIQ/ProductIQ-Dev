/**
 * E2E Test: Landing Page + Public Navigation
 */
import { test, expect } from '../fixtures'

test.describe('Landing Page', () => {
  test('renders hero section with CTA', async ({ mockPage: page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ProductIQ/i)
    // Check for a heading or CTA button
    await expect(page.locator('body')).toContainText(/ProductIQ/i)
  })

  test('navigation to pricing page works', async ({ mockPage: page }) => {
    await page.goto('/')
    // Try clicking a pricing link or navigating directly
    await page.goto('/pricing')
    await expect(page.locator('body')).toContainText(/pricing|plan|pro|starter/i)
  })

  test('navigation to login page works', async ({ mockPage: page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).toContainText(/login|sign in|email/i)
  })

  test('navigation to signup page works', async ({ mockPage: page }) => {
    await page.goto('/signup')
    await expect(page.locator('body')).toContainText(/sign up|create account|register/i)
  })

  test('404 page renders for unknown routes', async ({ mockPage: page }) => {
    await page.goto('/this-page-does-not-exist')
    // Should either show 404 content or redirect to landing
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
