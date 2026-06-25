// src/lib/sentry.ts
// Sentry initialization for the frontend.
// If VITE_SENTRY_DSN is not set, Sentry is not initialized (no-op).
// This allows local development without a Sentry account.

import * as Sentry from '@sentry/react'

const isE2E = import.meta.env.VITE_E2E_TEST === 'true'
const dsn = import.meta.env.VITE_SENTRY_DSN

let initialized = false

export function initSentry(): boolean {
  // Don't initialize Sentry in E2E tests or if DSN is not set
  if (isE2E || !dsn) {
    return false
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: 0.1,
    sendDefaultPii: true,

    // React Router integration — create a transaction per route change
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Filter out sensitive data
    beforeSend(event) {
      // Scrub authorization headers from request data
      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, string>
        for (const key of Object.keys(headers)) {
          if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'cookie') {
            headers[key] = '[REDACTED]'
          }
        }
      }
      return event
    },

    // Don't capture errors from these origins
    denyUrls: [
      // Chrome extensions
      /chrome-extension:\/\//,
      // Safari extensions
      /safari-extension:\/\//,
    ],

    // Ignore these error types
    ignoreErrors: [
      // ResizeObserver loop error (benign browser issue)
      'ResizeObserver loop limit exceeded',
      // Network errors (handled by axios interceptor)
      'Network Error',
      // Supabase auth errors (handled by useAuth)
      'Invalid login credentials',
      'JWT expired',
    ],
  })

  // Set global tags
  Sentry.setTag('app', 'productiq-frontend')
  Sentry.setTag('app_env', import.meta.env.MODE)

  initialized = true
  return true
}

// ── User context ──────────────────────────────────────────────────────────────
export function setSentryUser(user: { id: string; email?: string; username?: string } | null) {
  if (!initialized) return
  Sentry.setUser(user)
}

export function clearSentryUser() {
  if (!initialized) return
  Sentry.setUser(null)
}

// ── Breadcrumbs ───────────────────────────────────────────────────────────────
export function addSentryBreadcrumb(category: string, message: string, level: Sentry.SeverityLevel = 'info', data?: Record<string, unknown>) {
  if (!initialized) return
  Sentry.addBreadcrumb({ category, message, level, data })
}

// ── Manual capture ────────────────────────────────────────────────────────────
export function captureException(error: Error | unknown, context?: Record<string, unknown>) {
  if (!initialized) return
  Sentry.captureException(error, { extra: context })
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (!initialized) return
  Sentry.captureMessage(message, level)
}

// ── Performance ───────────────────────────────────────────────────────────────
export function startSpan<T>(name: string, op: string, callback: () => T): T {
  if (!initialized) return callback()
  return Sentry.startSpan({ name, op }, callback)
}

// Re-export the ErrorBoundary component from Sentry
export const SentryErrorBoundary = Sentry.ErrorBoundary
export const SentryReact = Sentry
