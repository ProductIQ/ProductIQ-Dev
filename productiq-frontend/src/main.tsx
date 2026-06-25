// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css'
import { App } from './App'
import { AuthProvider } from './hooks/useAuth'
import { queryClient } from './lib/queryClient'
import { initSentry, SentryErrorBoundary } from './lib/sentry'

// Initialize Sentry before rendering (no-op if VITE_SENTRY_DSN is not set)
initSentry()

// ── Error fallback component ──────────────────────────────────────────────────
function ErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F4F5] p-6">
      <div className="max-w-md w-full bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#0A0A0A] flex items-center justify-center mx-auto mb-4">
          <span className="text-[#C8F04A] font-bold text-[16px]">!</span>
        </div>
        <h1 className="text-[20px] font-bold text-[#0A0A0A] mb-2">Something went wrong</h1>
        <p className="text-[13px] text-[#6B6B6B] mb-6">
          An unexpected error occurred. Our team has been notified. Try refreshing the page.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetError}
            className="btn btn-black btn-sm"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-outline btn-sm"
          >
            Refresh page
          </button>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SentryErrorBoundary fallback={ErrorFallback} showDialog={false}>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#1E1E2A',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                },
                className: 'backdrop-blur-md',
              }}
            />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </SentryErrorBoundary>
  </StrictMode>
)
