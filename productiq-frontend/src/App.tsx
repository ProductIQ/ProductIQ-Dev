// src/App.tsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { LandingPage }       from '@/pages/LandingPage'
import { LoginPage }         from '@/pages/auth/LoginPage'
import { SignupPage }        from '@/pages/auth/SignupPage'
import { DashboardPage }     from '@/pages/DashboardPage'
import { NewReportPage }     from '@/pages/NewReportPage'
import { RunStatusPage }     from '@/pages/RunStatusPage'
import { Loader2 }           from 'lucide-react'
import { ReportViewPage }    from '@/pages/ReportViewPage'
import { SentimentPage }     from '@/pages/SentimentPage'
import { PriceTrackerPage }  from '@/pages/PriceTrackerPage'
import { SettingsPage }      from '@/pages/SettingsPage'
import { PricingPage }       from '@/pages/PricingPage'
import { KnowledgeGraphPage } from '@/pages/KnowledgeGraphPage'
import { NotFoundPage }      from '@/pages/NotFoundPage'

// ── New v2 pages ──────────────────────────────────────────────────────────────
import { IntelligencePage }  from '@/pages/IntelligencePage'
import { BrandsPage }        from '@/pages/BrandsPage'
import { ChatPage }          from '@/pages/ChatPage'
import { ComparePage }       from '@/pages/ComparePage'
import { ValidatePage }      from '@/pages/ValidatePage'
import { NotificationsPage } from '@/pages/NotificationsPage'

// ── Auth Guard ─────────────────────────────────────────────────────────────────
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

// ── Page transition wrapper ────────────────────────────────────────────────────
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

// ── Root ───────────────────────────────────────────────────────────────────────
export function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/"        element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/login"   element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/signup"  element={<PageTransition><SignupPage /></PageTransition>} />
        <Route path="/pricing" element={<PageTransition><PricingPage /></PageTransition>} />

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
          <Route path="dashboard"           element={<DashboardPage />} />
          <Route path="reports/new"         element={<NewReportPage />} />
          <Route path="reports/:runId/status" element={<RunStatusPage />} />
          <Route path="reports/:runId"      element={<ReportViewPage />} />
          <Route path="sentiment"           element={<SentimentPage />} />
          <Route path="prices"              element={<PriceTrackerPage />} />
          <Route path="settings"            element={<SettingsPage />} />
          <Route path="knowledge"           element={<KnowledgeGraphPage />} />

          {/* ── v2 Intelligence pages ── */}
          <Route path="intelligence"        element={<IntelligencePage />} />
          <Route path="brands"              element={<BrandsPage />} />
          <Route path="notifications"       element={<NotificationsPage />} />

          {/* ── v2 AI Tools ── */}
          <Route path="chat"                element={<ChatPage />} />
          <Route path="compare"             element={<ComparePage />} />
          <Route path="validate"            element={<ValidatePage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}
