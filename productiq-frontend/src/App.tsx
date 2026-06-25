// src/App.tsx
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { Loader2 } from 'lucide-react'

// ── Eager imports (critical path: landing + auth shell) ──────────────────────
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// ── Lazy imports (loaded on-demand when route is visited) ────────────────────
const PricingPage       = lazy(() => import('@/pages/PricingPage').then(m => ({ default: m.PricingPage })))
const DashboardPage     = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const NewReportPage     = lazy(() => import('@/pages/NewReportPage').then(m => ({ default: m.NewReportPage })))
const RunStatusPage     = lazy(() => import('@/pages/RunStatusPage').then(m => ({ default: m.RunStatusPage })))
const ReportViewPage    = lazy(() => import('@/pages/ReportViewPage').then(m => ({ default: m.ReportViewPage })))
const SentimentPage     = lazy(() => import('@/pages/SentimentPage').then(m => ({ default: m.SentimentPage })))
const PriceTrackerPage  = lazy(() => import('@/pages/PriceTrackerPage').then(m => ({ default: m.PriceTrackerPage })))
const SettingsPage      = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const KnowledgeGraphPage = lazy(() => import('@/pages/KnowledgeGraphPage').then(m => ({ default: m.KnowledgeGraphPage })))

// ── v2 pages (lazy) ──────────────────────────────────────────────────────────
const IntelligencePage  = lazy(() => import('@/pages/IntelligencePage').then(m => ({ default: m.IntelligencePage })))
const BrandsPage        = lazy(() => import('@/pages/BrandsPage').then(m => ({ default: m.BrandsPage })))
const ChatPage          = lazy(() => import('@/pages/ChatPage').then(m => ({ default: m.ChatPage })))
const ComparePage       = lazy(() => import('@/pages/ComparePage').then(m => ({ default: m.ComparePage })))
const ValidatePage      = lazy(() => import('@/pages/ValidatePage').then(m => ({ default: m.ValidatePage })))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })))

// ── Admin page (lazy) ────────────────────────────────────────────────────────
const AdminPage          = lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })))

// ── Route-level loading fallback ─────────────────────────────────────────────
function RouteLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 size={20} className="text-[#A3A3A3] animate-spin" />
    </div>
  )
}

// ── Auth Guard ────────────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F0F12]">
        <Loader2 size={24} className="text-brand-400 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ── Page transition wrapper ──────────────────────────────────────────────────
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  )
}

// ── Lazy route wrapper (Suspense + transition) ───────────────────────────────
function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition>
      <Suspense fallback={<RouteLoader />}>
        {children}
      </Suspense>
    </PageTransition>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public — eager (landing page is the first thing users see) */}
        <Route path="/"        element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/login"   element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/signup"  element={<PageTransition><SignupPage /></PageTransition>} />
        <Route path="/pricing" element={<LazyRoute><PricingPage /></LazyRoute>} />

        {/* Protected — wrapped in AppShell */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          {/* Core */}
          <Route path="dashboard"           element={<Suspense fallback={<RouteLoader />}><DashboardPage /></Suspense>} />
          <Route path="reports/new"         element={<Suspense fallback={<RouteLoader />}><NewReportPage /></Suspense>} />
          <Route path="reports/:runId/status" element={<Suspense fallback={<RouteLoader />}><RunStatusPage /></Suspense>} />
          <Route path="reports/:runId"      element={<Suspense fallback={<RouteLoader />}><ReportViewPage /></Suspense>} />
          <Route path="sentiment"           element={<Suspense fallback={<RouteLoader />}><SentimentPage /></Suspense>} />
          <Route path="prices"              element={<Suspense fallback={<RouteLoader />}><PriceTrackerPage /></Suspense>} />
          <Route path="settings"            element={<Suspense fallback={<RouteLoader />}><SettingsPage /></Suspense>} />
          <Route path="knowledge"           element={<Suspense fallback={<RouteLoader />}><KnowledgeGraphPage /></Suspense>} />

          {/* ── v2 Intelligence pages ── */}
          <Route path="intelligence"        element={<Suspense fallback={<RouteLoader />}><IntelligencePage /></Suspense>} />
          <Route path="brands"              element={<Suspense fallback={<RouteLoader />}><BrandsPage /></Suspense>} />
          <Route path="notifications"       element={<Suspense fallback={<RouteLoader />}><NotificationsPage /></Suspense>} />

          {/* ── v2 AI Tools ── */}
          <Route path="chat"                element={<Suspense fallback={<RouteLoader />}><ChatPage /></Suspense>} />
          <Route path="compare"             element={<Suspense fallback={<RouteLoader />}><ComparePage /></Suspense>} />
          <Route path="validate"            element={<Suspense fallback={<RouteLoader />}><ValidatePage /></Suspense>} />

          {/* ── Admin ── */}
          <Route path="admin"               element={<Suspense fallback={<RouteLoader />}><AdminPage /></Suspense>} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}
