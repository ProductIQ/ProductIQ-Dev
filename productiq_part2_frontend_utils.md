# ProductIQ — Part 2: Frontend & Utilities Vibe Coding Guide
> React + Vite + Tailwind CSS + Bits UI + Animated Components. No traditional CSS — everything is utility-first. This is a vibe coding reference, not copy-paste code. Use it to guide your AI IDE.

---

## Table of Contents

1. [Frontend Philosophy & Stack Decisions](#1-frontend-philosophy--stack-decisions)
2. [Project Setup & Tooling](#2-project-setup--tooling)
3. [Folder Structure](#3-folder-structure)
4. [Tailwind Config (Complete)](#4-tailwind-config-complete)
5. [Design Tokens & Theme System](#5-design-tokens--theme-system)
6. [Animation Strategy (Framer Motion + CSS)](#6-animation-strategy-framer-motion--css)
7. [Supabase Client & Auth Setup](#7-supabase-client--auth-setup)
8. [API Client & React Query Setup](#8-api-client--react-query-setup)
9. [Routing Architecture](#9-routing-architecture)
10. [Auth Pages](#10-auth-pages)
11. [Dashboard Page](#11-dashboard-page)
12. [New Report Page](#12-new-report-page)
13. [Run Status Page (Killer Demo Screen)](#13-run-status-page-killer-demo-screen)
14. [Report View Page](#14-report-view-page)
15. [Knowledge Graph Page](#15-knowledge-graph-page)
16. [Sentiment Dashboard Page](#16-sentiment-dashboard-page)
17. [Price Tracker Page](#17-price-tracker-page)
18. [Settings Page](#18-settings-page)
19. [Pricing Page](#19-pricing-page)
20. [Shared Component Library](#20-shared-component-library)
21. [Charts & Data Visualization](#21-charts--data-visualization)
22. [Supabase Realtime Hooks](#22-supabase-realtime-hooks)
23. [SSE Agent Stream Hook](#23-sse-agent-stream-hook)
24. [Utility Functions](#24-utility-functions)
25. [State Management](#25-state-management)
26. [Error Handling & Loading States](#26-error-handling--loading-states)
27. [Responsive Design System](#27-responsive-design-system)
28. [Environment Variables](#28-environment-variables)
29. [Build & Deployment](#29-build--deployment)
30. [Frontend Build Order (Week 5–8)](#30-frontend-build-order-week-58)

---

## 1. Frontend Philosophy & Stack Decisions

### The Three Rules for ProductIQ's Frontend

**Rule 1 — Speed over perfection.** You are vibe coding. Describe what you want to your AI IDE in plain English using the structure in this document. The goal is a working, impressive demo in days, not weeks.

**Rule 2 — Animated, not flashy.** Every animation must communicate something: agent status changing, data loading, score updating. No animations that are just decorative noise. Motion carries meaning.

**Rule 3 — The Run Status page is everything.** Every other page is supporting cast. The screen where users watch 8 AI agents activate one by one in real time is your demo, your sales pitch, and your product differentiator. Make it extraordinary.

### Stack Decisions

| Layer | Choice | Why |
|---|---|---|
| Build tool | Vite | Fastest HMR, native ESM, zero config |
| UI framework | React 18 | Concurrent rendering, great ecosystem |
| Styling | Tailwind CSS v3 | Utility-first, no CSS files, consistent spacing |
| Component primitives | Bits UI | Headless accessible components (radix-based) |
| Animated components | Motion (Framer Motion v11) | `useAnimate`, `AnimatePresence`, layout animations |
| Additional animations | AutoAnimate | One-line list animations |
| Icons | Lucide React | Consistent, tree-shakeable |
| Charts | Recharts | Composable, React-native, easy to animate |
| Graph viz | React Force Graph | D3-backed, perfect for knowledge graph |
| Data fetching | TanStack Query v5 | Caching, background refetch, optimistic updates |
| Forms | React Hook Form + Zod | Type-safe validation, minimal re-renders |
| Routing | React Router v6 | File-based mental model, nested routes |
| Supabase | @supabase/supabase-js v2 | Auth + Realtime + direct DB queries |
| Notifications | Sonner | Beautiful toasts, zero config |
| Date utils | date-fns | Tree-shakeable, locale-aware |
| Number format | Intl API (built-in) | No dependency needed |

### What Bits UI Gives You

Bits UI provides unstyled, accessible headless components — dialogs, dropdowns, tabs, tooltips, popovers, accordions — that you style entirely with Tailwind. This means you get:
- Full keyboard navigation and ARIA attributes for free
- No fighting with third-party CSS specificity
- Complete visual control through Tailwind classes
- Smooth integration with Framer Motion for entrance/exit animations

---

## 2. Project Setup & Tooling

### Scaffold Command

```bash
npm create vite@latest productiq-frontend -- --template react-ts
cd productiq-frontend
```

### All Dependencies

```bash
# Core
npm install react-router-dom@6 @tanstack/react-query@5 axios

# Supabase
npm install @supabase/supabase-js

# Styling & Components
npm install bits-ui tailwind-merge clsx

# Animation
npm install motion @formkit/auto-animate canvas-confetti

# Charts & Graph
npm install recharts react-force-graph-2d

# Forms
npm install react-hook-form zod @hookform/resolvers

# Icons & UI
npm install lucide-react sonner date-fns

# State
npm install zustand

# Dev dependencies
npm install -D tailwindcss@3 postcss autoprefixer @types/node @types/canvas-confetti
npx tailwindcss init -p
```

### Vite Config

```
// vite.config.ts

Tell vibe coder:
- Set resolve alias: @ → src directory
- Proxy /api requests to http://localhost:8000 (avoids CORS in development)
- Enable React plugin
- Set build output to dist/
- HMR on port 5173
- build.rollupOptions.output.manualChunks:
    vendor-react: ['react', 'react-dom', 'react-router-dom']
    vendor-query: ['@tanstack/react-query']
    vendor-charts: ['recharts']
    vendor-motion: ['motion']
    vendor-supabase: ['@supabase/supabase-js']
    vendor-graph: ['react-force-graph-2d']
```

### TypeScript Config

```
// tsconfig.json

Tell vibe coder:
- Target ES2020
- Enable strict mode
- Set paths: "@/*" → ["./src/*"]
- Include DOM and DOM.Iterable lib
- moduleResolution: bundler
```

---

## 3. Folder Structure

```
src/
├── main.tsx                    # App entry, QueryClient, Toaster, PostHog
├── App.tsx                     # Router setup, auth guard
│
├── lib/
│   ├── supabase.ts             # Supabase client singleton
│   ├── api.ts                  # Axios client + interceptors
│   ├── queryClient.ts          # TanStack Query config
│   └── utils.ts                # cn(), formatINR(), formatDate(), etc.
│
├── hooks/
│   ├── useAuth.ts              # Auth state + session
│   ├── useProfile.ts           # User profile + plan
│   ├── useAgentStream.ts       # SSE hook for run progress
│   ├── useRealtimeSentiment.ts # Supabase Realtime subscription
│   ├── useRealtimeAgentRun.ts  # Supabase Realtime for run status
│   ├── useRuns.ts              # React Query: fetch runs
│   ├── useReport.ts            # React Query: fetch report data
│   ├── usePayments.ts          # Razorpay order + verify
│   └── useCountUp.ts           # Animated number count-up
│
├── stores/
│   └── useUIStore.ts           # Zustand: sidebar, modals, theme
│
├── types/
│   ├── agent.ts                # AgentRun, AgentOutput types
│   ├── report.ts               # Product, Review, Competitor, etc.
│   └── user.ts                 # Profile, Plan types
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── SignupPage.tsx
│   ├── DashboardPage.tsx
│   ├── NewReportPage.tsx
│   ├── RunStatusPage.tsx       # THE killer screen
│   ├── ReportViewPage.tsx
│   ├── KnowledgeGraphPage.tsx
│   ├── SentimentPage.tsx
│   ├── PricePage.tsx
│   ├── SettingsPage.tsx
│   └── PricingPage.tsx
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # Sidebar + topbar shell
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   ├── agents/
│   │   ├── AgentCard.tsx       # Individual agent status card
│   │   ├── AgentGrid.tsx       # 8-card grid with animations
│   │   └── AgentTimeline.tsx   # Vertical timeline of agent steps
│   ├── charts/
│   │   ├── SentimentGauge.tsx
│   │   ├── PriceTrendChart.tsx
│   │   ├── ClusterBubbleChart.tsx
│   │   ├── CompetitorRadar.tsx
│   │   └── TrendVelocityChart.tsx
│   ├── report/
│   │   ├── ReportTabs.tsx
│   │   ├── InsightCard.tsx
│   │   ├── ConceptCard.tsx
│   │   ├── GTMSection.tsx
│   │   └── CompetitorTable.tsx
│   ├── ui/
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Dialog.tsx
│   │   ├── Input.tsx
│   │   ├── Progress.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Tabs.tsx
│   │   ├── Tooltip.tsx
│   │   └── PlanGate.tsx        # Wraps premium features
│   └── shared/
│       ├── UsageMeter.tsx
│       ├── ReferralCard.tsx
│       ├── EmptyState.tsx
│       └── RunCard.tsx
│
└── assets/
    └── logo.svg
```

---

## 4. Tailwind Config (Complete)

```
// tailwind.config.ts

Tell vibe coder to configure:

CONTENT paths:
  - ./index.html
  - ./src/**/*.{ts,tsx}

THEME extends:

Colors:
  brand:
    50:  '#EEEDFE'   (lightest purple — subtle bg tints)
    100: '#CECBF6'
    200: '#AFA9EC'
    400: '#7F77DD'
    500: '#6B63D4'   (primary interactive purple)
    600: '#534AB7'
    800: '#3C3489'
    900: '#26215C'
  surface:
    0: '#FFFFFF'     (cards, inputs, modals)
    1: '#FAFAF9'     (page background)
    2: '#F4F3F0'     (sidebar, panels)
    3: '#EDEBE8'     (dividers, hover bg)
  ink:
    primary:   '#1C1B18'   (headings, important text)
    secondary: '#5A5956'   (body text)
    tertiary:  '#9C9A93'   (placeholders, timestamps)
    inverse:   '#FFFFFF'
  coral:
    50:  '#FAECE7'
    300: '#F0997B'
    400: '#D85A30'
    700: '#712B13'

Font family:
  sans: ['Inter', 'system-ui', 'sans-serif']
  mono: ['JetBrains Mono', 'Fira Code', 'monospace']

Border radius:
  sm:   '4px'
  DEFAULT: '8px'
  md:   '10px'
  lg:   '14px'
  xl:   '20px'
  2xl:  '28px'
  full: '9999px'

Box shadow:
  card:      '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
  elevated:  '0 4px 12px rgba(0,0,0,0.08)'
  glow-brand:'0 0 0 3px rgba(127,119,221,0.20)'

Animation keyframes:
  shimmer:
    from: background-position 200% 0
    to:   background-position -200% 0
  pulse-soft:
    0%, 100%: opacity 1
    50%:      opacity 0.6
  slide-up:
    from: transform translateY(8px), opacity 0
    to:   transform translateY(0),   opacity 1
  draw-in:
    from: stroke-dashoffset 1000
    to:   stroke-dashoffset 0

Animation utilities:
  animate-shimmer:    shimmer 1.5s ease-in-out infinite
  animate-pulse-soft: pulse-soft 2s ease-in-out infinite
  animate-slide-up:   slide-up 0.2s ease-out forwards
  animate-draw-in:    draw-in 1.5s ease-out forwards

PLUGINS:
  - @tailwindcss/typography
```

### Load Inter Font

```
// index.html <head>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## 5. Design Tokens & Theme System

### Color Usage Rules

ProductIQ uses a consistent color language across all components. Tell your vibe coder to follow these strictly.

**Brand purple (`brand-*`)** — Active states, primary CTAs, agent "running" indicators, progress bars, links, selected tabs. Never use for errors or warnings.

**`surface-*` scale** — Background hierarchy:
- `surface-0` (white) → Cards, modals, inputs
- `surface-1` → Page background
- `surface-2` → Sidebar, secondary panels
- `surface-3` → Hover states, dividers

**`ink-*` scale** — Text hierarchy:
- `ink-primary` → Headings, important data
- `ink-secondary` → Body text, descriptions
- `ink-tertiary` → Placeholders, timestamps, muted labels

**Status colors:**
- Green → Agent completed, payment success, positive sentiment
- Amber → Agent queued/pending, freemium warning
- Red → Agent failed, negative sentiment, error state
- Brand purple → Agent running (with animation)

### Typography Scale

Tell vibe coder to use exactly these Tailwind class combinations:

```
Display:    text-3xl font-semibold tracking-tight text-ink-primary
Heading 1:  text-2xl font-semibold text-ink-primary
Heading 2:  text-xl font-medium text-ink-primary
Heading 3:  text-base font-medium text-ink-primary
Body:       text-sm text-ink-secondary leading-relaxed
Caption:    text-xs text-ink-tertiary
Mono:       font-mono text-sm text-ink-secondary
Label:      text-xs font-medium uppercase tracking-wide text-ink-tertiary
```

### Spacing Rhythm

Use multiples of 4px (Tailwind's default). Consistent spacing units:
- Component internal padding: `p-4` or `p-5` (16/20px)
- Card gap: `gap-4` (16px)
- Section gap: `gap-8` (32px)
- Page padding: `px-6 py-8` on main content area

---

## 6. Animation Strategy (Framer Motion + CSS)

### The Animation Vocabulary

ProductIQ uses a small, consistent set of animations. Tell your vibe coder to use these and only these — don't invent new motion patterns per component.

**Entrance (`slide-up-fade`):**
```
motion config:
  initial:    { opacity: 0, y: 8 }
  animate:    { opacity: 1, y: 0 }
  transition: { duration: 0.2, ease: 'easeOut' }

Use for: page transitions, card appearance, modal opening.
```

**Staggered list (`stagger-children`):**
```
Container:
  variants: {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } }
  }
  initial="hidden" animate="show"

Item:
  variants: {
    hidden: { opacity: 0, y: 6 },
    show:   { opacity: 1, y: 0 }
  }

Use for: agent cards on Run Status page, report insights list, competitor table rows.
```

**Status pulse (`status-pulse`) — RUNNING agents only:**
```
animate: { opacity: [1, 0.5, 1], scale: [1, 1.04, 1] }
transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }

Use ONLY on the active agent indicator dot.
Never pulse multiple elements simultaneously.
```

**Layout animation:**
```
Add layout prop to any motion.div that can shift position:
  <motion.div layout layoutId="agent-{name}">

Use for: agent list reordering, sidebar collapse, content expanding.
```

**Animated progress bar:**
```
Width animates from 0 to target%:
  animate: { width: `${pct}%` }
  transition: { duration: 0.5, ease: 'easeOut' }
```

**Accordion expand (AnimatePresence):**
```
Wrap collapsible content:
  initial: { height: 0, opacity: 0 }
  animate: { height: 'auto', opacity: 1 }
  exit:    { height: 0, opacity: 0 }
  transition: { duration: 0.2, ease: 'easeInOut' }
```

**Number count-up:**
```
// src/hooks/useCountUp.ts

Tell vibe coder to build this hook:
  Takes: target (number), duration (ms, default 1000)
  Uses requestAnimationFrame to increment from 0 to target
  Returns: current animated value (integer)
  Starts on mount

Used on: dashboard stats, sentiment score display, report count badges.
```

**Card status flash (green completion flash):**
```
When agent status changes to 'completed':
  Briefly animate the card background:
    animate: { backgroundColor: ['#DCFCE7', '#FFFFFF'] }
    transition: { duration: 0.5, ease: 'easeOut' }
  Then revert to normal card styling.
```

**Confetti on report completion:**
```
When run.status changes to 'completed' on RunStatusPage:
  import confetti from 'canvas-confetti'
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#7F77DD', '#5DCAA5', '#EF9F27'],
  })
Fire once, not in a loop.
```

**AutoAnimate usage:**
```
npm install @formkit/auto-animate
import { useAutoAnimate } from '@formkit/auto-animate/react'

const [listRef] = useAutoAnimate()
<ul ref={listRef}>...</ul>

Apply to: runs history list, insights list, competitor rows, any list with dynamic add/remove.
Zero config — handles all list animations automatically.
```

---

## 7. Supabase Client & Auth Setup

```
// src/lib/supabase.ts

Tell vibe coder:
  Create a singleton Supabase client using createClient from @supabase/supabase-js.
  Use VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from import.meta.env.
  Export the client as named export 'supabase'.
  The anon key is safe to expose in frontend — RLS policies on each table enforce access control.
```

```
// src/hooks/useAuth.ts

Tell vibe coder to create a hook + context that:

1. Creates AuthContext with: user, session, isLoading, signIn, signUp, signOut
2. AuthProvider component subscribes to supabase.auth.onAuthStateChange
3. Stores session and user in useState
4. Sets isLoading=true until the initial auth state resolves (prevents login flash)
5. signIn(email, password): calls supabase.auth.signInWithPassword
6. signUp(email, password, metadata): calls supabase.auth.signUp, then inserts profile row
7. signOut(): calls supabase.auth.signOut, navigate to /login
8. Wrap entire app with AuthProvider in main.tsx
9. Export useAuth() hook for consuming in any component

On sign up, create a profile row in Supabase:
  supabase.table('profiles').insert({
    id: user.id,
    email: user.email,
    full_name: metadata.full_name,
    company_name: metadata.company_name,
    plan: 'free',
    reports_limit: 3,
  })
```

```
// src/App.tsx — guard components

ProtectedRoute:
  Reads { user, isLoading } from useAuth
  While isLoading → show full-page spinner (brand purple spinner, centered)
  If no user → <Navigate to="/login" replace />
  Otherwise → render children

PlanRoute (extends ProtectedRoute):
  Takes requiredPlan prop
  Reads user plan from useProfile
  If plan meets requirement → render children
  Else → <Navigate to="/pricing" replace />
```

---

## 8. API Client & React Query Setup

```
// src/lib/api.ts

Tell vibe coder to create an Axios instance with:

baseURL: import.meta.env.VITE_API_URL (default: 'http://localhost:8000')
timeout: 30000ms
headers: { 'Content-Type': 'application/json' }

Request interceptor:
  Gets current Supabase session: const { data } = await supabase.auth.getSession()
  If session exists → adds Authorization: Bearer {session.access_token}

Response interceptor:
  On 401 → calls supabase.auth.signOut() then window.location.href = '/login'
  On 403 → toast.error('Access denied. Check your plan.')
  On 500 → toast.error('Server error. Please try again.')
  On network error → toast.error('Connection error. Check your network.')
  Returns response.data directly on success (unwraps axios wrapper)

Typed API functions to export:
  startRun(payload: RunRequest): POST /api/reports/run → RunResponse
  getReport(runId: string): GET /api/reports/:runId → RunDetailResponse
  listReports(): GET /api/reports → RunResponse[]
  createOrder(payload: OrderRequest): POST /api/payments/order → OrderResponse
  verifyPayment(payload: VerifyRequest): POST /api/payments/verify → { status: string }
```

```
// src/lib/queryClient.ts

Tell vibe coder:
  Create QueryClient with defaultOptions:
    queries.staleTime: 30_000 (30 seconds)
    queries.retry: 2
    queries.refetchOnWindowFocus: true
    mutations.onError: (error) => toast.error(error.message)

  Wrap <App /> in <QueryClientProvider client={queryClient}> in main.tsx
```

```
// src/hooks/useRuns.ts

useRuns():
  queryKey: ['runs']
  queryFn: listReports()
  Returns: { runs, isLoading, error, refetch }

useRun(runId):
  queryKey: ['run', runId]
  queryFn: getReport(runId)
  enabled: !!runId
  refetchInterval: (data) => {
    if data?.run?.status === 'running' || data?.run?.status === 'queued'
    → return 5000 (poll every 5s as SSE fallback)
    else return false
  }
  Returns: { run, report, agentOutputs, isLoading }

useStartRun():
  useMutation wrapping startRun()
  onSuccess: (data) => {
    queryClient.invalidateQueries(['runs'])
    navigate('/reports/' + data.run_id + '/status')
  }
  onError: (error) => toast.error('Failed to start report: ' + error.message)
  Returns: { startRun, isPending }

useProfile():
  queryKey: ['profile']
  queryFn: supabase.from('profiles').select('*').eq('id', user.id).single()
  Returns: { profile, isLoading }
  Expose: profile.plan, profile.reports_used_this_month, profile.reports_limit
```

---

## 9. Routing Architecture

```
// src/App.tsx

Tell vibe coder to set up React Router v6 with this exact structure:

Routes:
  /                     → redirect to /dashboard if authed, /login if not
  /login                → LoginPage (public)
  /signup               → SignupPage (public)
  /pricing              → PricingPage (public, no AppShell)

  All below wrapped in <ProtectedRoute>:
  /dashboard                        → AppShell > DashboardPage
  /reports/new                      → AppShell > NewReportPage
  /reports/:runId/status            → AppShell (collapsed) > RunStatusPage
  /reports/:runId                   → AppShell > ReportViewPage
  /reports/:runId/graph             → full screen, no AppShell > KnowledgeGraphPage
  /sentiment                        → AppShell > PlanRoute(pro) > SentimentPage
  /prices                           → AppShell > PlanRoute(pro) > PricePage
  /settings                         → AppShell > SettingsPage
  *                                 → redirect to /dashboard

RunStatusPage sets useUIStore.sidebarCollapsed = true on mount, restores on unmount.
KnowledgeGraphPage renders without AppShell entirely (needs full canvas).

Page transitions:
  Wrap all route <Outlet> content with:
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.12}}>
    </AnimatePresence>
```

---

## 10. Auth Pages

### LoginPage

```
Tell vibe coder to build LoginPage:

Layout:
  Full viewport height, flex items-center justify-center
  Background: surface-1 (off-white)
  
Card:
  bg-surface-0 rounded-2xl shadow-elevated p-8 w-full max-w-sm
  Entrance: motion.div with slide-up-fade animation on mount

Contents (top to bottom):
  1. Logo: centered, logo.svg 32px height
  2. Wordmark: "ProductIQ" text-xl font-semibold text-ink-primary, mt-3
  3. Tagline: "Sign in to your account" text-sm text-ink-tertiary, mb-8
  
  4. Email input
     - Label: "Email" (text-xs font-medium text-ink-secondary mb-1)
     - Input: full width, rounded-lg, border border-surface-3, px-3 py-2.5 text-sm
     - Focus: ring-2 ring-brand-400 border-transparent
     - React Hook Form register: required, email format validation (Zod)
     - Error message: text-xs text-red-600 mt-1 (AnimatePresence for enter/exit)
  
  5. Password input
     - Same styling as email
     - Right side: show/hide toggle button (Lucide Eye / EyeOff icons, text-ink-tertiary)
     - Toggle managed by local useState showPassword
  
  6. "Sign in" button
     - Full width, bg-brand-500 hover:bg-brand-600, text-white, py-2.5, rounded-lg, font-medium
     - Loading state: spinner (Lucide Loader2 animate-spin) + "Signing in..." text
     - active:scale-[0.98] for press feedback
  
  7. Divider: "or" between two horizontal lines (text-ink-tertiary text-xs)
  
  8. "Don't have an account?" + "Sign up" link to /signup
     text-sm text-ink-tertiary + text-brand-500 font-medium hover:underline

Error handling:
  If signIn fails: show error box below button
    bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700
  AnimatePresence wraps the error box (slide-up-fade entrance)
```

### SignupPage

```
Tell vibe coder to build SignupPage:

Same card layout as LoginPage.

Additional fields:
  1. Full name input (required, minLength 2)
  2. Company name input (optional, placeholder "Your brand or company")
  3. Email (required, valid email)
  4. Password (required, minLength 8)
  5. Confirm password (must match password)
  6. Referral code input (optional, pre-filled from URL ?ref= query param on mount)

Referral code field styling:
  If pre-filled from URL: show green checkmark icon + "Referral code applied" label
  Input: same as other fields but with lock icon if code came from URL

Submit behavior:
  - Validate all fields with Zod schema
  - Call signUp(email, password, { full_name, company_name, referral_code })
  - On success: navigate to /dashboard
  - Show Sonner toast: "Welcome to ProductIQ! Your first 3 reports are free."

Below form: "Already have an account? Sign in" link to /login
```

---

## 11. Dashboard Page

```
Tell vibe coder to build DashboardPage:

Layout: AppShell. Inside main content:
  Desktop: lg:grid lg:grid-cols-3 lg:gap-8
  Left main area: col-span-2
  Right sidebar area: col-span-1

--- TOPBAR CONTENT ---
Left: "Good {morning/afternoon/evening}, {firstName}!" (derive from time of day)
Right: <Button onClick={navigate('/reports/new')}>+ New Report</Button> (brand purple)

--- USAGE METER CARD ---
Full-width card at top of left column.
bg-surface-0 rounded-xl p-5 shadow-card border border-surface-3

Left side: text "Reports this month"
Center: UsageMeter component (progress bar)
Right side: "{used} / {limit}" number display + "Upgrade" link if free plan
Upgrade link: text-brand-500 text-sm hover:underline

If free and >80% used: entire card shifts to amber-50 bg with amber left border accent (border-l-4 border-amber-400)

--- STATS ROW ---
grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4

4 stat cards (bg-surface-0, rounded-lg, p-4, shadow-card):
  Card 1: Total reports
    - Large number (useCountUp hook, ink-primary text-2xl font-semibold)
    - Label "Reports generated" (text-xs text-ink-tertiary mt-1)
    - Lucide FileText icon top-right (text-brand-200 w-5 h-5)
  
  Card 2: Products analysed
    - Lucide ShoppingBag icon
    
  Card 3: Reviews processed
    - Lucide MessageSquare icon
    
  Card 4: Avg report time
    - Formatted as "X min" using formatDuration()
    - Lucide Clock icon

All counts animate up from 0 on page load (useCountUp, 800ms duration).

--- RECENT REPORTS ---
Section header row:
  "Recent reports" (text-base font-medium) + "View all →" link (text-sm text-brand-500)

List of RunCard components (max 5)
Apply useAutoAnimate to the list container for smooth animations.
EmptyState if no runs: icon=FileText, title="No reports yet", description="Start your first AI-powered intelligence report in minutes.", actionLabel="+ New Report", onAction=navigate('/reports/new')

--- RIGHT SIDEBAR ---
Stack of widgets (gap-4 flex flex-col):

Widget 1: Sentiment Monitor (PlanGate pro)
  If pro: SentimentGauge component (compact version, 200px)
         Brand name + current score below gauge
         "Updated today at 7am IST" caption
  If free: Locked card with Lucide Lock icon
           "Monitor brand sentiment in real time"
           Upgrade button → /pricing

Widget 2: Quick Actions
  bg-surface-0 rounded-xl p-4 shadow-card
  Title: "Quick actions" (text-sm font-medium text-ink-primary)
  List of action buttons (each: flex items-center gap-2, text-sm text-ink-secondary, hover:text-ink-primary, py-2, border-b border-surface-3 last:border-0):
    + New Report → /reports/new
    Knowledge Graph → /reports/:lastRunId/graph (disabled with tooltip if no runs)
    Price Tracker → /prices
    Settings → /settings

Widget 3: Referral Card
  bg-brand-50 rounded-xl p-4 border border-brand-100
  Heading: "Unlock more free reports"
  Body: "Refer a D2C brand. Each referral unlocks 2 extra reports."
  Referral link: monospace display + copy button (Lucide Copy → Check on copy)
  Count: "{N} successful referrals · {N*2} bonus reports unlocked" (text-xs text-brand-800)
```

---

## 12. New Report Page

```
Tell vibe coder to build NewReportPage:

Layout: max-w-xl mx-auto px-4 py-10

Page entrance: entire page content wrapped in motion.div with slide-up-fade

--- HEADING ---
text-2xl font-semibold text-ink-primary: "Start an intelligence report"
text-sm text-ink-tertiary mt-2: "Your AI team analyses products, reviews, competitors, and trends in ~10 minutes."

--- FORM ---
React Hook Form + Zod. Gap-5 between fields.

Field 1: Product Category (required)
  Label: "Product category *"
  Input: text, placeholder "e.g. Protein powder, Face serum, Baby food"
  Helper: "Be specific — 'whey protein' works better than 'supplements'" (text-xs text-ink-tertiary)
  Zod: z.string().min(3).max(100)
  Error: text-xs text-red-600, AnimatePresence

Field 2: Brand Name (optional)
  Label: "Your brand or competitor brand"
  Badge: "Optional" (bg-surface-2 text-ink-tertiary text-xs px-1.5 py-0.5 rounded ml-1.5)
  Input: text, placeholder "e.g. MuscleBlaze, Mamaearth, Minimalist"
  Helper: "Leave blank to analyse the full category"

Field 3: Target Market (Bits UI Select)
  Label: "Target market"
  Select trigger: full width, border border-surface-3 rounded-lg px-3 py-2.5 text-sm bg-surface-0
  Options: India (default), India – Tier 1 cities, India – Tier 2+ cities, Global
  Bits UI Select.Root > Select.Trigger > Select.Content > Select.Item

--- AGENT PREVIEW ---
Section heading: "What happens when you submit" (text-xs uppercase tracking-wide text-ink-tertiary mb-3)

8 small cards in grid-cols-4 gap-2:
  Each card: bg-surface-2 rounded-lg p-3
    Agent number: font-mono text-xs text-ink-tertiary (01, 02, ...)
    Agent name: text-xs font-medium text-ink-secondary
    All in muted "pending" look — this is a preview, not live status
    
Entrance: stagger-children animation (0.04s between cards, slide-up-fade)

--- SUBMIT BUTTON ---
mt-6 w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium text-sm
Text: "Start intelligence report  →"
Loading: Lucide Loader2 animate-spin + "Queuing your agents..."
Disabled + muted when isPending

--- USAGE NOTICE (below button) ---
text-xs text-ink-tertiary text-center mt-3

If free plan with remaining reports:
  "This will use 1 of your {remaining} remaining free reports this month."

If free plan with 0 remaining:
  Show amber warning banner instead of form:
    bg-amber-50 border border-amber-200 rounded-xl p-5 text-center
    Lucide AlertTriangle icon (amber, w-6 h-6)
    "Monthly limit reached"
    "Upgrade to Pro for unlimited reports, or refer a brand to unlock 2 more."
    Two buttons: "Upgrade to Pro" (brand purple) + "Copy referral link" (outline)
    Hide the form fields, only show the banner.

If pro plan: "Unlimited reports · Pro plan active" with green dot
```

---

## 13. Run Status Page (Killer Demo Screen)

This is the most important page. It is your product demo. Make it extraordinary.

```
Tell vibe coder to build RunStatusPage:

URL: /reports/:runId/status
On mount: useUIStore.setSidebarCollapsed(true) to give full width
On unmount: restore sidebar state

Data:
  useRun(runId) for initial + polling fallback
  useAgentStream(runId) for live SSE updates (primary)
  useRealtimeAgentRun(runId) for Supabase Realtime updates (secondary)

Merge state from all three sources — whichever arrives first wins.

---  LAYOUT ---
Single column, px-6 py-8, max-w-4xl mx-auto

--- HEADER ROW ---
Flex between: back button (left) + status badge (right)

Back button: "← Back" (text-sm text-ink-tertiary hover:text-ink-primary)
Title: "{productCategory} report" (text-2xl font-semibold, mt-2)
Subtitle: "Run ID: {runId.slice(0,8)}" (text-xs font-mono text-ink-tertiary)

Status badge (Badge component, size md):
  queued → variant warning + pulsing amber dot + "Setting up agents"
  running → variant brand + pulsing brand dot + "Agents working"
  completed → variant success + solid green dot + "Report ready"
  failed → variant danger + solid red dot + "Failed"

The status badge itself transitions with AnimatePresence when status changes.

--- GLOBAL PROGRESS BAR ---
Full width, mt-4 mb-8
Two elements:
  1. Progress bar:
     Track: h-1.5 bg-surface-3 rounded-full w-full
     Fill: h-full bg-brand-500 rounded-full
     Motion.div: animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}
  
  2. Progress label:
     Right-aligned text-xs text-ink-tertiary mt-1: "{progressPct}% complete"
     
When complete: fill becomes bg-green-500 and percentage shows "100% · Done"

--- AGENT GRID ---
grid grid-cols-2 md:grid-cols-4 gap-4

8 AgentCard components. Stagger-children animation on mount.

AgentCard visual states (full spec):

PENDING state:
  bg-surface-2 border border-surface-3 rounded-xl p-4
  Opacity: 0.6 (everything muted)
  Agent number: font-mono text-xs text-ink-tertiary → "01"
  Agent name: text-sm font-medium text-ink-tertiary
  Description: text-xs text-ink-tertiary line-clamp-1
  Bottom: small gray dot (w-2 h-2 bg-surface-3 rounded-full)
  No icon in top-right

RUNNING state:
  bg-brand-50 border-2 border-brand-400 rounded-xl p-4 shadow-glow-brand
  Agent number: font-mono text-xs text-brand-600
  Agent name: text-sm font-medium text-ink-primary
  Description: text-xs text-ink-secondary
  Bottom: status-pulse animated brand dot (w-2 h-2 bg-brand-500 rounded-full)
  Top-right: Lucide Loader2 w-4 h-4 text-brand-400 animate-spin
  
  The card itself has a subtle animation:
    animate={{ scale: [1, 1.01, 1] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}

COMPLETED state:
  bg-surface-0 border border-green-200 rounded-xl p-4
  Agent number: font-mono text-xs text-green-600
  Agent name: text-sm font-medium text-ink-primary
  Description: text-xs text-ink-secondary
  Bottom: solid green dot (w-2 h-2 bg-green-500 rounded-full)
  Top-right: Lucide CheckCircle2 w-4 h-4 text-green-500
  
  On status change to completed: flash animation
    animate={{ backgroundColor: ['#DCFCE7', '#FFFFFF'] }}
    transition={{ duration: 0.6 }}

FAILED state:
  bg-red-50 border border-red-200 rounded-xl p-4
  Muted red text for all text elements
  Bottom: solid red dot
  Top-right: Lucide XCircle w-4 h-4 text-red-500

Duration label: if completedAt and startedAt both set:
  Show "Completed in {formatDuration(duration)}" below agent name in tiny text
  Only show for completed agents.

--- LIVE LOG SECTION ---
mt-8

Collapsible section using Bits UI Accordion:
  Trigger: "Live agent log" text-sm font-medium + Lucide ChevronDown (rotates on expand)
  Default: collapsed

When expanded (AnimatePresence height animation):
  Terminal-style log box:
    bg-surface-2 rounded-lg p-4 font-mono text-xs max-h-52 overflow-y-auto
    border border-surface-3
  
  Each log line:
    - Timestamp: text-ink-tertiary (HH:mm:ss format)
    - Agent badge: bg-brand-100 text-brand-800 rounded px-1 text-xs
    - Message: text-ink-secondary
    
  Log lines appear with:
    motion.div initial={{ opacity:0, x:-4 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.1 }}
  
  Auto-scrolls to bottom using useEffect on log array length change:
    logContainerRef.current?.scrollTo({ top: Infinity, behavior: 'smooth' })

--- COMPLETION SECTION ---
AnimatePresence — renders when run.status === 'completed'

motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}

Success card:
  bg-gradient-to-br from-green-50 to-surface-0 border border-green-200 rounded-2xl p-8 mt-6 text-center
  
  Lucide CheckCircle2: w-12 h-12 text-green-500, mx-auto mb-4
  Title: "Your report is ready" (text-xl font-semibold text-ink-primary)
  Subtitle: "Generated {N} insights, {N} product concepts, and a full GTM strategy." (text-sm text-ink-secondary mt-1)
  
  Download buttons row (flex justify-center gap-3 mt-6):
    PDF button: bg-surface-0 border border-surface-3 hover:border-surface-2 rounded-lg px-4 py-2.5 text-sm flex items-center gap-2
      Lucide FileText w-4 h-4 text-ink-tertiary + "Download PDF"
    PPTX button: same style
      Lucide Presentation w-4 h-4 + "Download PPTX"
  
  "View full report" button: mt-4, full width, bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg font-medium text-sm
    → navigate('/reports/' + runId)

On status change to completed: fire confetti() (canvas-confetti)

--- FAILED SECTION ---
AnimatePresence — renders when run.status === 'failed'

Red card with error message, "Retry" button, "Contact support" link.
Retry: calls useStartRun with same product_category and brand_name.

--- CONNECTION INDICATOR ---
Fixed bottom-right (or below progress bar): 
  When isConnected (SSE active): green dot + "Live"
  When !isConnected: amber dot + "Polling every 5s"
  text-xs text-ink-tertiary flex items-center gap-1.5
```

---

## 14. Report View Page

```
Tell vibe coder to build ReportViewPage:

URL: /reports/:runId
Data fetched: all from Supabase directly using the anon client (RLS ensures isolation)

Fetch these tables for the given runId:
  agent_runs (for metadata)
  insights
  review_clusters
  competitors
  trends
  product_concepts
  gtm_plans
  reports (for PDF/PPTX URLs)

--- PAGE HEADER ---
Breadcrumb: text-xs text-ink-tertiary "Reports / {category}"
Title: "{category} Intelligence Report" text-2xl font-semibold text-ink-primary mt-1
Meta row: text-sm text-ink-tertiary flex gap-4
  "Generated {formatDate(createdAt)}"
  "Duration: {formatDuration(duration)}"
  "by ProductIQ"

Download buttons (right side of header, or below on mobile):
  Same style as RunStatusPage completion buttons.

--- REPORT TABS ---
Bits UI Tabs, full width, border-b border-surface-3

Tab list: horizontal, tabs flush left
Tab trigger styling:
  px-4 py-2.5 text-sm font-medium text-ink-tertiary
  Active: text-brand-500, border-b-2 border-brand-500
  Hover: text-ink-secondary

Tab labels:
  Overview | Consumer Intel | Competitors | Trends | Concepts | GTM Plan

Each tab panel: AnimatePresence + motion.div with opacity 0→1 on tab change

--- TAB 1: Overview ---
3 stat cards (grid-cols-3):
  Products analysed | Reviews mined | Competitors mapped

Top 5 insights as InsightCard list (stagger-children animation)
Lucide TrendingUp icon + "Top opportunity" callout card with the #1 market gap

--- TAB 2: Consumer Intelligence ---
Section A — Sentiment breakdown:
  Horizontal segmented bar (3 segments: positive/neutral/negative)
  Each segment: colored fill, animated width on mount, percentage label
  green: positive, gray: neutral, red: negative
  Legend: 3 badges below

Section B — Topic clusters (ClusterBubbleChart):
  See Section 21 for chart spec.
  
Section C — Pain points list:
  Ranked list, each item:
    Pain point label (text-sm font-medium)
    Bar indicator (relative width = review_count / max_count)
    Review count badge (text-xs)
  
  Click a pain point → expand Bits UI Accordion showing 2–3 verbatim sample reviews
    Sample reviews styled as blockquotes (italic, border-l-4 border-brand-200 pl-3)

Section D — Feature requests:
  Card grid (grid-cols-2 gap-3)
  Each card: feature label + request count + "Most wanted" badge for #1

--- TAB 3: Competitors ---
CompetitorTable: full-width Tailwind table
  Columns: Brand | Product | Price | Rating | Reviews | Strength | Gap
  Table styling: text-sm, border-separate border-spacing-0
  Header: bg-surface-2, text-xs font-medium uppercase tracking-wide text-ink-tertiary
  Rows: hover:bg-surface-1 transition-colors
  Clickable rows: expand to show full competitor detail below table (AnimatePresence)
  Apply useAutoAnimate to tbody

CompetitorRadar chart below table (see Section 21)

--- TAB 4: Trends ---
TrendVelocityChart (see Section 21) — 12-month line chart

Rising trends cards: grid-cols-2 gap-4
Each card:
  Trend keyword (font-medium)
  Velocity badge (rising/stable/declining using velocityBadgeVariant utility)
  Peak prediction: "Expected peak: {month}" (text-xs text-ink-tertiary)
  Untapped badge: "Competitors not acting on this" (green-50 bg, small pill)

--- TAB 5: Product Concepts ---
3 ConceptCard components, stacked (gap-6)
See Section 20 for full spec.
Each card animates in with stagger (0.1s between cards)

--- TAB 6: GTM Plan ---
GTMSection component:
  Sub-sections:
    Launch channels (ranked list with ROI rationale)
    Messaging framework (styled callout blocks)
    90-day timeline (horizontal scrollable, fixed height timeline component)
    Budget donut chart — two Recharts PieCharts side by side (₹5L and ₹20L)
    Influencer tier table
```

---

## 15. Knowledge Graph Page

```
Tell vibe coder to build KnowledgeGraphPage:

URL: /reports/:runId/graph
Layout: Fully full-screen — no AppShell. Custom minimal header only.

Fetch: knowledge_nodes and knowledge_edges for this runId from Supabase.

--- TOPBAR (custom) ---
Fixed top bar: h-12 bg-surface-0 border-b border-surface-3 px-4 flex items-center justify-between
Left: "←" back button + "Knowledge Graph" title (text-sm font-medium)
Right: "Export PNG" button (calls graph ref method) + zoom controls (+/-)

--- GRAPH CANVAS ---
react-force-graph-2d fills remaining viewport height (100vh minus 48px header)
Background: surface-1

Node styling:
  brand → circle r=14, fill=#7F77DD (brand-500)
  competitor → circle r=10, fill=#D85A30 (coral-400)
  feature → circle r=7, fill=#1D9E75 (teal)
  customer_need → circle r=9, fill=#EF9F27 (amber)
  trend → circle r=8, fill=#639922 (green)
  supplier → circle r=6, fill=#888780 (gray)

Node label: drawn below node in 10px system-ui font, color matches node fill darkened

Edge styling:
  COMPETES_WITH: stroke #F09595 (red-200) width 1.5
  HAS_FEATURE: stroke #5DCAA5 (teal-300) width 1
  ADDRESSES_NEED: stroke #97C459 (green-200) width 1
  AFFECTED_BY: stroke #FAC775 (amber-200) width 1

Edge width: scales with weight property (min 0.5, max 3)

Interactions:
  onNodeClick: set selectedNode state → shows detail sidebar
  onNodeHover: highlight connected nodes, dim others (change opacity via nodeColor callback)
  cooldownTicks: 100 (stabilise after 100 physics ticks)
  d3AlphaDecay: 0.04 (smooth settling)

--- LEGEND OVERLAY ---
position: absolute bottom-4 left-4
bg-surface-0 rounded-xl shadow-elevated p-3 border border-surface-3
Collapsed by default. Toggle button (Lucide Layers icon).
When open: 6 rows of (colored dot + node type label), text-xs

--- DETAIL SIDEBAR ---
position: absolute top-12 right-0 bottom-0 w-72
bg-surface-0 border-l border-surface-3 p-5 overflow-y-auto
Slide in from right: motion.div initial={{x:288}} animate={{x:0}} transition={{duration:0.2}}
Renders when selectedNode is not null.

Contents:
  Node type badge (colored, matching graph color)
  Node label (text-lg font-medium text-ink-primary)
  Divider
  Properties from JSONB: key-value pairs (text-xs)
  "Connected to X nodes" (text-sm text-ink-secondary)
  Close button (Lucide X, top-right of sidebar)

--- FILTER CONTROLS ---
position: absolute top-16 right-4 (when sidebar is closed)
bg-surface-0 rounded-xl shadow-elevated p-3 border border-surface-3

Checkbox list (Bits UI Checkbox) for each node type:
  [x] Products  [ ] Features  [x] Competitors  [x] Trends  [ ] Suppliers  [x] Needs

Filtering: computed nodes/links arrays from raw data, filtering out unchecked types.
Graph re-renders when filter changes (key changes force remount of react-force-graph-2d).
```

---

## 16. Sentiment Dashboard Page

```
Tell vibe coder to build SentimentPage:

URL: /sentiment
Guard: PlanGate pro

Data:
  Direct Supabase query: sentiment_scores WHERE user_id = me ORDER BY scored_at DESC LIMIT 200
  useRealtimeSentiment hook (Section 22) for live updates

--- HEADER ---
"Brand health monitor" heading
Flex between: heading + live indicator (right)
Live indicator: pulsing green dot + "Live" text-xs text-green-600

--- SCORE HERO (centered) ---
Max-w-sm mx-auto mt-6

SentimentGauge component (large variant, full spec in Section 21)
Below gauge:
  Score number: text-4xl font-semibold font-mono (useCountUp, 1s duration, 2 decimal places)
  Label: sentimentLabel(score) in matching sentimentColor class (text-sm font-medium)
  Delta: "↑ +0.12 vs 7-day avg" or "↓ -0.08 vs 7-day avg"
    Green if positive delta, red if negative delta
    text-xs mt-1

--- PLATFORM BREAKDOWN ---
grid grid-cols-3 gap-4 mt-8

Each platform card (bg-surface-0 rounded-xl p-4 shadow-card border border-surface-3):
  Platform name (text-sm font-medium text-ink-primary)
  Score (text-xl font-semibold font-mono, colored by sentimentColor)
  Count: "{N} mentions" (text-xs text-ink-tertiary)
  Trend arrow: up green or down red (Lucide TrendingUp / TrendingDown)

--- 30-DAY TREND CHART ---
mt-8 bg-surface-0 rounded-xl p-5 shadow-card

Title: "Sentiment trend — 30 days" (text-sm font-medium mb-4)
TrendVelocityChart variant (sentiment mode):
  Recharts LineChart + AreaChart
  Y-axis: -1 to +1, reference line at 0 (neutral)
  Gradient fill below line: green above 0, red below 0 (CSS linearGradient defs in SVG)
  X-axis: dates formatted as "Jan 1" style

--- REALTIME BEHAVIOR ---
When useRealtimeSentiment fires new score:
  Sonner toast: "Sentiment updated" with score (4s, closeable)
  Gauge needle animates to new position (spring animation, 0.8s)
  Score number count-ups to new value (0.5s)
  New data point added to trend chart (React Query refetch)
  Platform breakdown cards update values

--- ALERTS HISTORY ---
mt-8

"Alert history" heading (text-sm font-medium)
If no alerts: EmptyState with heart icon "No alerts — your brand sentiment is healthy."

Alert list (flex flex-col gap-2):
  Each alert: bg-red-50 rounded-lg p-3 flex justify-between
    Left: date + "Score dropped {N} points" (text-sm)
    Right: "Slack alert sent" badge (red variant)
```

---

## 17. Price Tracker Page

```
Tell vibe coder to build PricePage:

URL: /prices
Guard: PlanGate pro

Data: Supabase query price_history joined with products for user's runs

--- HEADER ---
"Price intelligence" heading
Last updated: "Updated: {formatRelativeTime(lastScoredAt)}"
Platform filter: row of pill buttons (All / Amazon / Flipkart) — client-side filter

--- PRICE OVERVIEW TABLE ---
bg-surface-0 rounded-xl shadow-card overflow-hidden

Table with sticky header:
  thead: bg-surface-2 text-xs uppercase tracking-wide text-ink-tertiary
  th padding: px-4 py-3
  
  Columns:
    Product name (truncated to 30 chars with Tooltip for full name)
    Brand
    Platform (badge)
    Current price (formatINR)
    MRP (formatINR, text-ink-tertiary line-through if discount)
    Discount % (green badge if >20%, amber if 10-20%)
    24h change (up/down arrow + %, colored red/green/gray)
    Rating (⭐ number)
  
  Sort: clicking column header toggles asc/desc (useState sortKey, sortDir)
  Arrow icon (Lucide ArrowUp/ArrowDown) next to sorted column header
  
  tbody rows: hover:bg-surface-1 cursor-pointer
  Apply useAutoAnimate to tbody.
  
  Clicking a row: sets selectedProduct state

--- SELECTED PRODUCT DETAIL ---
AnimatePresence — renders when selectedProduct is not null

Slides up from below table (slide-up-fade, mt-6):
  bg-surface-0 rounded-xl p-6 shadow-card border border-surface-3

  Product name heading + platform badges

  PriceTrendChart (see Section 21) — 90-day history

  Elasticity Card:
    bg-brand-50 rounded-xl p-5 border border-brand-100
    "Optimal price" label (text-xs text-brand-600 uppercase tracking-wide)
    Optimal price: text-3xl font-semibold text-brand-800 (formatINR)
    R-squared: "Model confidence: {r2 * 100}%" (text-xs text-brand-600)
    Interpretation text (text-sm text-ink-secondary)
    "Price sensitivity: High / Medium / Low" Badge below

  Competitor comparison table (mini):
    3-4 rows: same product on different platforms
    Color-coded price differences (lowest price → green bg, others → surface)

Close button: Lucide X top-right of the detail card
```

---

## 18. Settings Page

```
Tell vibe coder to build SettingsPage:

URL: /settings
Layout: max-w-2xl mx-auto px-4 py-8

Page heading: "Account settings" (text-2xl font-semibold)

--- BITS UI TABS ---
Horizontal tabs, styled with Tailwind (same as ReportViewPage tabs):
  Profile | Notifications | Billing | API

TAB 1: Profile
  Avatar section:
    Initials circle: w-14 h-14 rounded-full bg generated by generateAvatarColor(name)
    Initials: text-white font-semibold text-lg
    "Upload photo" button below (disabled, Tooltip "Coming soon in v2")
  
  Form (React Hook Form):
    Full name (text input, required)
    Company name (text input, optional)
    Email (disabled, shows current, icon lock)
    Target market preference (Bits UI Select)
  
  Save button: bg-brand-500 text-white px-5 py-2 rounded-lg text-sm font-medium
  On success: Sonner success toast "Profile saved"
  
  Danger zone:
    Section at bottom with border-red-100 border rounded-xl p-4
    "Delete account" button (outlined red) → opens Bits UI Dialog for confirmation

TAB 2: Notifications
  Each row: flex justify-between items-center py-3.5 border-b border-surface-3 last:border-0
  Left: label + description
  Right: Bits UI Switch (custom Tailwind styled)
  
  Toggles:
    Email: Report ready notification (default on)
    Email: Weekly digest (default on)
    Slack: Sentiment drop alerts (default off)
    WhatsApp: Report ready (default off, "Coming soon" badge next to label)
  
  Slack Webhook URL (shown when Slack toggle is on):
    Input: full width, font-mono text-sm, placeholder "https://hooks.slack.com/services/..."
    "Test" button: bg-surface-2 hover:bg-surface-3 text-sm px-3 py-1.5 rounded-lg
    On test success: Sonner "Test message sent to Slack!"
    Helper link: "How to set up a Slack webhook ↗" text-xs text-brand-500

TAB 3: Billing
  Current plan card:
    bg-surface-2 rounded-xl p-5 border border-surface-3
    Plan badge (large, colored by plan)
    Price + renewal date
    Features list (Lucide Check, green)
    Upgrade / Manage subscription button
    "Manage subscription" → links to Razorpay customer portal
  
  Usage meter: UsageMeter component
  
  Referral section:
    Referral link input (readonly, with copy button)
    "{N} referrals · {N*2} bonus reports unlocked" stat
    Animation: copy button icon flips from Copy to Check on click, back after 2s
  
  Transaction history table:
    Columns: Date | Amount | Plan | Status | PDF
    Status: Badge (paid=success, failed=danger, refunded=warning)
    PDF: Lucide Receipt icon button (disabled/placeholder for now)
    Apply useAutoAnimate

TAB 4: API Access
  Coming soon card:
    bg-brand-50 rounded-xl p-8 text-center border border-brand-100
    Lucide Code2 icon w-10 h-10 text-brand-400 mx-auto
    "API access coming in Pro v2"
    "Build on top of ProductIQ's intelligence layer. Get notified when it launches."
    Email input + "Notify me" button (stores interest, low priority feature)
```

---

## 19. Pricing Page

```
Tell vibe coder to build PricingPage:

URL: /pricing
Layout: Full-width, no AppShell. Standalone page.

Custom nav: h-14 border-b border-surface-3 px-6 flex items-center justify-between
  Left: logo + wordmark
  Right: "Sign in" link (if not authed) or "Dashboard →" link (if authed)

--- HERO ---
text-center py-16 max-w-2xl mx-auto

Subheading pill: bg-brand-50 text-brand-800 text-xs font-medium px-3 py-1 rounded-full inline-block mb-4
  "10-minute market research · Built for D2C brands"

Heading: text-4xl font-bold tracking-tight text-ink-primary leading-tight
  "Replace ₹2 lakh consulting reports"

Subtext: text-lg text-ink-secondary mt-3
  "AI intelligence reports for D2C brands — from ₹999 or free with referrals."

--- BILLING TOGGLE ---
flex items-center justify-center gap-3 mt-8

"Monthly" (text-sm) + Bits UI Switch + "Yearly — save 20%" (text-sm text-green-600)
Toggle state: useState billingPeriod = 'monthly' | 'yearly'
When yearly: show discounted prices on all cards
(Yearly prices: Pro ₹3,999/mo, shown as ₹47,988/yr billed annually)

--- PLAN CARDS ---
grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-10 px-4

Card 1: Free
  bg-surface-0 rounded-2xl p-8 border border-surface-3 shadow-card
  Plan name: "Free" (text-sm font-medium text-ink-tertiary uppercase tracking-wide)
  Price: "₹0" (text-4xl font-bold text-ink-primary) + "/month" (text-sm text-ink-tertiary)
  Subtext: "3 reports per month, forever" (text-sm text-ink-secondary mt-1)
  
  Divider (border-t border-surface-3 my-6)
  
  Features list (flex flex-col gap-3):
    Each item: flex items-start gap-2
      Lucide Check w-4 h-4 text-green-500 flex-shrink-0 mt-0.5
      text-sm text-ink-secondary
    Items: Agents 1–5 | 1 category per report | PDF download | Email digest | Referral unlocks
  
  CTA: mt-6 w-full border border-surface-3 hover:border-brand-200 hover:bg-brand-50 text-ink-primary py-2.5 rounded-lg text-sm font-medium
    Text: "Get started free"
    → navigate to /signup

Card 2: Pro (FEATURED)
  transform: scale-[1.03] (slightly larger than siblings)
  bg-surface-0 rounded-2xl p-8 border-2 border-brand-400 shadow-elevated relative
  
  "Most popular" badge: absolute -top-3.5 left-1/2 -translate-x-1/2
    bg-brand-500 text-white text-xs font-medium px-4 py-1 rounded-full
  
  Plan name: "Pro" (text-sm font-medium text-brand-600 uppercase tracking-wide)
  Price: "₹4,999" + "/month"
    billingPeriod === 'yearly' → show "₹3,999" with "₹4,999" struck through in gray
  Subtext: "or ₹999 / report, pay-as-you-go" text-sm text-ink-secondary mt-1
  
  Features: all Free plus:
    All 12 agents | Unlimited reports | Real-time sentiment | Price optimizer
    Slack + WhatsApp alerts | PPT + PDF | API: 100 calls/day
  
  CTA: mt-6 w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg text-sm font-medium
    Text: "Start Pro"
    onClick: if authed → createOrder({plan:'pro_monthly'}) → Razorpay checkout
             if not authed → navigate('/signup?plan=pro')

Card 3: Enterprise
  bg-surface-2 rounded-2xl p-8 border border-surface-3 shadow-card
  Plan name: "Enterprise"
  Price: "Custom" (text-4xl font-bold text-ink-primary)
  Subtext: "₹50K–2L / month"
  
  Features: all Pro plus:
    White-label reports | Custom agents | Neo4j graph | On-prem deploy
    Tamil + English | Agent Marketplace | Dedicated SLA
  
  CTA: mt-6 w-full border border-surface-3 text-ink-primary py-2.5 rounded-lg text-sm font-medium
    Text: "Contact us"
    → mailto:hello@productiq.in

--- FAQ (optional but builds trust) ---
max-w-2xl mx-auto mt-16 pb-16

"Frequently asked questions" heading (text-xl font-semibold text-center)

4–5 questions in Bits UI Accordion:
  Q: "How is ProductIQ different from hiring a consultant?"
  Q: "What data sources do the agents use?"
  Q: "Is my data private?"
  Q: "Can I cancel anytime?"
  Q: "Do you support Tamil language?"

Each accordion item: border-b border-surface-3, trigger text-sm font-medium, content text-sm text-ink-secondary

--- RAZORPAY CHECKOUT ---
When CTA clicked (authed user):
  1. setIsLoadingCheckout(true) → button shows spinner
  2. createOrder({ plan: 'pro_monthly' })
  3. Load Razorpay script: script tag with src="https://checkout.razorpay.com/v1/checkout.js"
  4. Open: new window.Razorpay({
       key: import.meta.env.VITE_RAZORPAY_KEY_ID,
       amount: order.amount,
       currency: 'INR',
       order_id: order.order_id,
       name: 'ProductIQ',
       description: 'Pro Plan Subscription',
       prefill: { name: user.full_name, email: user.email },
       theme: { color: '#6B63D4' },
       handler: async (response) => {
         await verifyPayment({ ...response, plan: 'pro_monthly' })
         toast.success('Pro activated! Welcome to ProductIQ Pro.')
         queryClient.invalidateQueries(['profile'])
         navigate('/dashboard')
       },
     }).open()
  5. On modal close without payment: reset button state
```

---

## 20. Shared Component Library

### `AgentCard.tsx`
```
Props:
  agentName: string
  agentNumber: number (1–12)
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt?: string (ISO)
  completedAt?: string (ISO)

The component manages zero internal state — all driven by props.
Visual spec: see Section 13 (Run Status Page) for full state styling.
Wrap in motion.div with layoutId="agent-{agentNumber}" for layout animations.
Export as memo'd component: export default memo(AgentCard).
```

### `RunCard.tsx`
```
Props: run (AgentRun type with nested reports?)

Card: bg-surface-0 rounded-xl p-4 border border-surface-3 shadow-card cursor-pointer
Hover: border-brand-200, transition-colors duration-150

Contents:
  Row 1: category + brand (text-sm font-medium text-ink-primary truncated) + status Badge
  Row 2: "Created {formatRelativeTime(createdAt)}" (text-xs text-ink-tertiary) + platform count

If status = running:
  Progress bar below content (h-1 bg-surface-3 rounded-full):
    Animated brand fill: width = progressPct%

onClick: navigate to /reports/:runId/status if running, /reports/:runId if completed.
```

### `InsightCard.tsx`
```
Props:
  insight: { id, title, body, insight_type, confidence_score, sources }
  expanded?: boolean (controlled from parent)
  onToggle?: () => void

Card: bg-surface-0 rounded-xl border border-surface-3 shadow-card
Left accent: w-1 h-full rounded-l-xl, color by insight_type:
  market_gap → bg-brand-500
  consumer_need → bg-green-500
  competitive_advantage → bg-teal-500 (use #1D9E75)
  trend_opportunity → bg-amber-400
  risk → bg-red-400

Contents (pl-4 pr-5 py-4):
  Row 1: insight_type badge (text-xs) + confidence bar (text-xs text-ink-tertiary)
  Row 2: title (text-sm font-medium text-ink-primary mt-1)
  Row 3: body (text-xs text-ink-secondary mt-1.5)
    Collapsed: line-clamp-3
    Expanded: full text (AnimatePresence height animation)
  Row 4: confidence meter (h-0.5 bg-surface-3 rounded-full):
    Fill: width = confidence_score * 100%, color by score
    <40%: bg-red-400, 40-70%: bg-amber-400, >70%: bg-green-400
  Row 5 (expanded only): sources list in italic text-xs text-ink-tertiary

onClick entire card: toggle expanded state.
```

### `ConceptCard.tsx`
```
Props: concept (ProductConcept type), rank (1 | 2 | 3)

Card: bg-surface-0 rounded-2xl border border-surface-3 shadow-card p-6

Header:
  Left: Rank badge ("Concept {rank}") + concept name (text-xl font-semibold mt-1)
  Right: Validation score ring (custom SVG, 60px, animated arc)

Body sections (all visible, dense layout):
  Tagline: italic text-sm text-ink-secondary mt-2 leading-relaxed border-l-4 border-brand-200 pl-3

  Row of 3 pills:
    Target age range | Price: ₹{price} | Validation: {score}/100

  Two-column grid:
    Left: "USP" heading + body (text-sm)
    Right: "Gap addressed" heading + body (text-sm)

  "Key Features" (text-xs uppercase tracking-wide text-ink-tertiary mt-4 mb-2)
  Feature tags: flex flex-wrap gap-1.5
    Each: bg-brand-50 text-brand-800 text-xs rounded-full px-2.5 py-0.5

  "Risks" (collapsible, Bits UI Accordion):
    Each risk: text-xs text-red-600 with Lucide AlertTriangle w-3 h-3

  Name ideas: flex flex-wrap gap-1.5 mt-3
    Each: bg-surface-2 text-ink-secondary text-xs rounded-full px-2.5 py-0.5 cursor-pointer
    On click: copyToClipboard(name) + toast "Name copied!"

Validation score SVG ring:
  60px x 60px viewBox
  Background circle: stroke surface-3, stroke-width 4
  Score arc: stroke-dasharray computed from score, stroke color:
    <40 → red-400, 40-70 → amber-400, >70 → green-500
  Center text: score number (text-xs font-mono)
  Animate arc from 0 to score on mount (motion.circle with pathLength animation 0→1)
```

### `PlanGate.tsx`
```
Props:
  requiredPlan: 'pro' | 'enterprise'
  children: React.ReactNode
  fallback?: React.ReactNode

Implementation:
  Read user plan from useProfile.
  If planOrder(user.plan) >= planOrder(requiredPlan): render children.
  Else: render fallback OR default UpgradeBanner.

UpgradeBanner (default fallback):
  Relative positioned wrapper:
    Children rendered behind with: filter blur(4px) pointer-events-none select-none
    Overlay: absolute inset-0 bg-white/70 flex items-center justify-center rounded-xl
    
    Center card: bg-surface-0 rounded-xl shadow-elevated p-6 text-center max-w-xs
      Lucide Lock w-8 h-8 text-brand-400 mx-auto
      "Pro feature" badge (brand)
      Feature name text (text-sm font-medium)
      "Upgrade to Pro to access this feature." (text-xs text-ink-tertiary mt-1)
      Button → /pricing (brand purple, mt-4, full width of card)
```

### `UsageMeter.tsx`
```
Props: used, limit, plan, extraFromReferrals

Total limit = limit + extraFromReferrals
Pct = (used / totalLimit) * 100

Bar: h-2 bg-surface-3 rounded-full overflow-hidden
Fill: motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
Color: pct < 60 → bg-brand-500, pct 60-80 → bg-amber-400, pct > 80 → bg-red-400

Label row (flex justify-between text-xs mt-1.5):
  Left: "{used} of {totalLimit} reports used"
  Right: if pct > 80 and plan=free → "Upgrade ↗" link text-brand-500
```

### `EmptyState.tsx`
```
Props:
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void

Layout: flex flex-col items-center justify-center py-16 px-6 text-center

Icon container: w-14 h-14 bg-surface-2 rounded-2xl flex items-center justify-center mx-auto
Icon: className="w-6 h-6 text-ink-tertiary"

Title: text-sm font-medium text-ink-primary mt-4
Description: text-xs text-ink-tertiary mt-1.5 max-w-xs
Action button (if provided): mt-5, outlined brand style, text-sm
```

---

## 21. Charts & Data Visualization

All Recharts charts wrapped in ResponsiveContainer (width="100%", height fixed).
All charts use surface-3 for grid lines (#EDEBE8 hex).

### SentimentGauge (Custom SVG — NOT Recharts)
```
Props: score (-1 to 1), size ('compact' | 'large') 

SVG component, no external library.

Large variant: viewBox="0 0 300 170", rendered at 300px width
Compact variant: viewBox="0 0 200 115", rendered at 180px width

Structure:
  Background semicircle arc:
    cx=150 cy=150 (large) / cx=100 cy=100 (compact)
    radius=120 (large) / 80 (compact)
    From 180° to 0° (left to right, bottom half)
    stroke: #EDEBE8, stroke-width: 16, fill: none, stroke-linecap: round

  Colored arc (score indicator):
    Same path as background arc
    stroke: CSS linearGradient (red → amber → yellow → green)
    stroke-dasharray: totalArcLength
    stroke-dashoffset: totalArcLength - (score + 1) / 2 * totalArcLength
    motion.path animate={{ strokeDashoffset: targetOffset }} transition={{ duration: 0.8, ease: 'easeOut' }}
    
    Define gradient in <defs>:
      linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="100%" y2="0%"
        stop at 0%: #E24B4A (red-500)
        stop at 40%: #EF9F27 (amber-400)
        stop at 60%: #EF9F27
        stop at 100%: #639922 (green)

  Needle:
    Line from center to arc, rotates based on score
    rotation: (score + 1) / 2 * 180 - 90 degrees (from center point)
    motion.line animate={{ rotate: targetDeg }} (transformOrigin: center point)
    stroke: ink-primary, stroke-width: 2, stroke-linecap: round

  Center dot: small circle at center, fill: ink-tertiary

  Labels:
    "-1.0" at arc left endpoint (text-anchor: end, font-size: 10, fill: #E24B4A)
    "0" at arc top (text-anchor: middle)
    "+1.0" at arc right endpoint (text-anchor: start, fill: #639922)

  Center text (below arc center):
    Score: font-mono font-semibold, font-size: 24 (large) / 16 (compact)
    Fill: colored by sentimentColor(score)
```

### PriceTrendChart
```
Recharts AreaChart

Data shape: [{ date: string, amazon: number, flipkart: number }]

Props: data, optimalPrice (for reference line)

Components:
  CartesianGrid: horizontal lines only, stroke="#EDEBE8"
  XAxis: dataKey="date", tickFormatter=(d) => format(parseISO(d), 'MMM d'), tick size 11
  YAxis: tickFormatter=(v) => '₹' + v.toLocaleString('en-IN'), tick size 11
  
  Area for amazon:
    type="monotone" dataKey="amazon"
    stroke="#7F77DD" (brand-400) strokeWidth=2
    fill="#EEEDFE" (brand-50) fillOpacity=0.6
    dot: false, activeDot: { r: 4 }
  
  Area for flipkart:
    type="monotone" dataKey="flipkart"
    stroke="#D85A30" (coral-400) strokeWidth=2
    fill="#FAECE7" fillOpacity=0.6
  
  ReferenceLine:
    y={optimalPrice} stroke="#1D9E75" strokeDasharray="4 2"
    label: { value: 'Optimal ₹' + optimalPrice, fill: '#1D9E75', fontSize: 11 }
  
  Tooltip: custom component showing date, both prices, difference
  Legend: below chart, custom render with colored dots
  
  isAnimationActive: true, animationDuration: 800
```

### ClusterBubbleChart
```
Recharts ScatterChart

Data shape: [{ topic_id, avg_sentiment, review_count, topic_label, topic_type }]

Components:
  CartesianGrid: vertical={false}, stroke="#EDEBE8"
  XAxis: type="number" dataKey="topic_id" hide={true}
  YAxis: type="number" dataKey="avg_sentiment" domain={[-1, 1]}
    ReferenceLine y=0 stroke="#EDEBE8"
    label: { value: 'Sentiment', angle: -90 }
  ZAxis: type="number" dataKey="review_count" range={[40, 600]}
  
  Scatter: name="clusters"
    fill: computed per point by topic_type:
      pain_point → #F09595
      feature_request → #AFA9EC
      praise → #97C459
      neutral → #B4B2A9
    Use shape prop to render colored circles
  
  Tooltip: custom component showing:
    topic_label (heading)
    review_count + " reviews"
    sentimentLabel(avg_sentiment) with color
    topic_type badge
```

### CompetitorRadar
```
Recharts RadarChart

Data: normalize competitor values to 0–100 scale per axis before passing.
Axes: ['Price positioning', 'Rating quality', 'Review volume', 'Feature breadth', 'Marketing reach']

RadarChart: cx="50%" cy="50%" outerRadius=120
PolarGrid: gridType="polygon"
PolarAngleAxis: dataKey="axis", tick style text-xs

One Radar per competitor (max 6 competitors):
  Colors: brand-500, coral-400, teal-400, amber-400, green-500, gray-400
  fillOpacity: 0.1, strokeWidth: 2
  Animated entrance with isAnimationActive

Legend: below chart, flex wrap gap-4 text-xs
```

### TrendVelocityChart
```
Recharts LineChart

Data shape: [{ date, keyword1, keyword2, keyword3, ... }]
One Line per trend keyword.

Components:
  CartesianGrid: horizontal only, stroke="#EDEBE8"
  XAxis: dataKey="date" tickFormatter=(d) => format(parseISO(d), 'MMM')
  YAxis: domain=[0, 100] label={{ value: 'Interest', angle: -90 }}
  
  Per keyword Line:
    type="monotone" strokeWidth=2
    dot: false
    activeDot: { r: 4 }
    Colors: 6-color palette cycling
  
  ReferenceLine for "trend prediction": dashed, extends beyond data range
  
  Tooltip: custom, shows all keyword values for hovered date
  isAnimationActive: true, animationDuration: 1200
```

---

## 22. Supabase Realtime Hooks

```
// src/hooks/useRealtimeSentiment.ts

Tell vibe coder:

Hook signature:
  useRealtimeSentiment(userId: string | undefined)

On mount:
  Create channel: supabase.channel('sentiment-monitor-' + userId)
  Subscribe to:
    event: 'INSERT'
    schema: 'public'
    table: 'sentiment_scores'
    filter: 'user_id=eq.' + userId

  On new record (handleNewScore):
    Update local latestScore state
    Add to scoreHistory array (limit to last 200)
    If alert threshold exceeded: fire Sonner toast

  Channel status tracking:
    .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'))

On unmount:
  supabase.removeChannel(channel)

Return: { latestScore, scoreHistory, isConnected }

Guard: if !userId, return early with empty state.
```

```
// src/hooks/useRealtimeAgentRun.ts

Hook signature:
  useRealtimeAgentRun(runId: string | undefined)

On mount, create TWO channels:

Channel 1: agent_runs changes
  event: 'UPDATE', table: 'agent_runs', filter: 'id=eq.' + runId
  On update: update local run state
  When new status = 'completed': fire confetti()

Channel 2: agent_outputs changes
  event: 'UPDATE', table: 'agent_outputs', filter: 'run_id=eq.' + runId
  On update: merge into local agentOutputs array (match by agent_name, replace)

On unmount: supabase.removeAllChannels()

Return: { run, agentOutputs, isConnected }

Note: This runs parallel to useAgentStream (SSE). Whichever fires first updates state.
Both are active — Realtime is the backup when SSE is slower.
```

---

## 23. SSE Agent Stream Hook

```
// src/hooks/useAgentStream.ts

Hook signature:
  useAgentStream(runId: string | undefined)

State:
  agentOutputs: AgentOutput[] (array of all 12 possible agents, initialized as all 'pending')
  currentAgent: string | null
  progressPct: number (0–100)
  isConnected: boolean
  lastHeartbeat: Date | null
  log: LogLine[] (array of { timestamp, agentName, message })

On mount (if runId exists):
  1. Get Supabase session token:
     const { data } = await supabase.auth.getSession()
     const token = data.session?.access_token
  
  2. Open EventSource:
     const source = new EventSource(
       `${import.meta.env.VITE_API_URL}/api/stream/${runId}?token=${token}`
     )
  
  3. source.onopen: setIsConnected(true)
  
  4. source.onmessage: (event) => {
       const data = JSON.parse(event.data)
       
       if (data.type === 'heartbeat'):
         setLastHeartbeat(new Date())
         return
       
       if (data.type === 'agent_update'):
         setAgentOutputs(prev => prev.map(a =>
           a.agent_name === data.agent_name ? { ...a, status: data.status } : a
         ))
         setCurrentAgent(data.agent_name)
         setProgressPct(data.progress_pct)
         setLog(prev => [...prev, {
           timestamp: new Date().toLocaleTimeString(),
           agentName: data.agent_name,
           message: data.status === 'running' ? 'Started working' : 'Completed',
         }].slice(-100))
     }
  
  5. source.onerror: () => {
       setIsConnected(false)
       source.close()
       // Exponential backoff reconnect
       reconnectAttempts++
       const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000)
       setTimeout(() => reconnect(), delay)
     }
  
  6. Reconnect: if reconnectAttempts < 5, reopen EventSource; else give up (polling takes over)

On unmount: source.close()

Return: { agentOutputs, currentAgent, progressPct, isConnected, lastHeartbeat, log }
```

---

## 24. Utility Functions

```
// src/lib/utils.ts

Tell vibe coder to implement exactly these:

cn(...inputs):
  import { clsx } from 'clsx'
  import { twMerge } from 'tailwind-merge'
  export const cn = (...inputs) => twMerge(clsx(inputs))
  The canonical class merging utility. Use it everywhere.

formatINR(amount: number):
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
  Result: ₹4,999

formatINRCompact(amount: number):
  if amount >= 10000000: return '₹' + (amount / 10000000).toFixed(1) + 'Cr'
  if amount >= 100000: return '₹' + (amount / 100000).toFixed(1) + 'L'
  if amount >= 1000: return '₹' + (amount / 1000).toFixed(1) + 'K'
  return formatINR(amount)

formatDate(dateString: string):
  import { format, parseISO } from 'date-fns'
  return format(parseISO(dateString), 'dd MMM yyyy')

formatRelativeTime(dateString: string):
  import { formatDistanceToNow, parseISO } from 'date-fns'
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true })
  Result: "2 hours ago"

formatDuration(seconds: number):
  if seconds < 60: return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if seconds < 3600: return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`

truncate(str: string, max: number):
  return str.length > max ? str.slice(0, max) + '...' : str

planOrder(plan: string):
  { free: 0, pro: 1, enterprise: 2 }[plan] ?? 0

getInitials(name: string):
  const parts = name.trim().split(' ')
  if parts.length === 1: return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()

sentimentLabel(score: number):
  if score < -0.6: return 'Very Negative'
  if score < -0.2: return 'Negative'
  if score < 0.2:  return 'Neutral'
  if score < 0.6:  return 'Positive'
  return 'Very Positive'

sentimentColor(score: number):
  if score < -0.6: return 'text-red-600'
  if score < -0.2: return 'text-red-400'
  if score < 0.2:  return 'text-ink-tertiary'
  if score < 0.6:  return 'text-green-500'
  return 'text-green-600'

velocityBadgeVariant(velocity: string):
  { rising: 'success', stable: 'default', declining: 'danger' }[velocity] ?? 'default'

async copyToClipboard(text: string):
  try:
    await navigator.clipboard.writeText(text)
    return true
  catch: return false

generateAvatarColor(name: string):
  const palette = ['bg-brand-500', 'bg-teal-500', 'bg-amber-500', 'bg-coral-400', 'bg-green-600', 'bg-blue-500']
  const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return palette[sum % palette.length]

// Types
export type Plan = 'free' | 'pro' | 'enterprise'
export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed'
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed'
```

```
// src/hooks/useCountUp.ts

Tell vibe coder:

function useCountUp(target: number, duration: number = 1000): number
  Uses useRef for rafId and startTime
  Uses useState for current value
  On mount: start RAF loop
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)  (ease-out cubic)
    setValue(Math.round(eased * target))
    if progress < 1: requestAnimationFrame(loop)
  On unmount: cancel RAF
  Returns: current value as integer
```

---

## 25. State Management

### Server State → TanStack Query

All data from Supabase or the FastAPI backend lives in React Query cache. Never duplicate server state into Zustand or useState.

Key query keys:
```
['runs']                     → list of all user's runs
['run', runId]               → single run with full data
['profile']                  → current user's profile + plan
['sentiment', userId]        → sentiment score history
['prices', runId]            → price history for a run
```

### Global UI State → Zustand

```
// src/stores/useUIStore.ts

Tell vibe coder to create a Zustand store with persist middleware for theme:

State shape:
  sidebarCollapsed: boolean (default: false)
  theme: 'light' | 'dark' (default: system)
  activeRunId: string | null
  reportTab: string (default: 'overview')

Actions:
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  toggleTheme: () => void   → also applies 'dark' class to document.documentElement
  setActiveRunId: (id: string | null) => void
  setReportTab: (tab: string) => void

Persistence:
  Use zustand/middleware persist for theme only (localStorage key: 'productiq-theme')
  sidebarCollapsed and activeRunId are session-only (not persisted)
```

### Local State → useState

Use useState for:
- Form input state within a single component (but prefer React Hook Form)
- UI toggle state: expand/collapse of individual accordion items
- selectedProduct on PricePage
- selectedNode on KnowledgeGraphPage
- showPassword on LoginPage

Never put things in useState that are needed by sibling or parent components — lift to Zustand or React Query instead.

---

## 26. Error Handling & Loading States

### Loading Strategy

Every page shows a Skeleton layout while loading, not a spinner. Skeletons match the exact layout of the real page.

```
Pattern for every data page:

const { data, isLoading, error, refetch } = useRun(runId)

if (isLoading) return <RunStatusSkeleton />
if (error) return <ErrorState error={error} retry={refetch} />
if (!data) return <EmptyState ... />
return <RunStatusContent data={data} />

Skeleton components:
  Use Tailwind's animate-pulse on a wrapper div
  Replace text with: <div className="h-4 bg-surface-3 rounded animate-pulse w-3/4" />
  Replace cards with: <div className="h-32 bg-surface-2 rounded-xl animate-pulse" />
  Match dimensions exactly to the real component they replace.
```

### ErrorState Component
```
Props: error (Error), retry (() => void), message?: string

Layout: centered, py-12 text-center
bg-red-50 rounded-xl border border-red-100 p-8 max-w-md mx-auto

Lucide AlertCircle w-10 h-10 text-red-400 mx-auto mb-3
Title: "Something went wrong" text-base font-medium text-ink-primary
Message: error.message or message prop text-sm text-ink-secondary mt-1 font-mono
Retry button: mt-5, Lucide RefreshCw icon, outlined style, onClick: retry
```

### Sonner Toast Config
```
// src/main.tsx

<Toaster
  position="bottom-right"
  richColors
  closeButton
  toastOptions={{
    duration: 4000,
    classNames: {
      toast: 'font-sans text-sm rounded-xl shadow-elevated',
    }
  }}
/>

Usage patterns:
  toast.success('Report ready!')                     → 4s, green
  toast.error('Failed to start report')              → 5s, red
  toast.info('Uploading your report...')             → manual dismiss
  const id = toast.loading('Generating PDF...')
  toast.dismiss(id) then toast.success('PDF ready!')
```

---

## 27. Responsive Design System

### Breakpoint Strategy

```
Tailwind breakpoints: sm=640px, md=768px, lg=1024px, xl=1280px

Mobile first — default styles are mobile, add sm:/md:/lg: prefixes for larger screens.

Mobile (< 640px):
  Sidebar: hidden, hamburger menu in topbar opens Bits UI Sheet (full drawer)
  All grids: grid-cols-1 (single column)
  Agent grid: grid-cols-2 (2 agents per row, reduced card size)
  Charts: h-48 (reduced from h-64)
  Report tabs: overflow-x-auto, nowrap (horizontally scrollable)
  KnowledgeGraphPage: fullscreen canvas, pinch-to-zoom enabled by react-force-graph-2d
  DashboardPage sidebar widgets: move below main content (col-span-1 stacks naturally)

Tablet (640px – 1024px):
  Sidebar: icon-only (64px wide), show full on hover (Bits UI HoverCard expanding sidebar)
  Agent grid: grid-cols-4
  Dashboard: grid-cols-1 (sidebar below)
  Plan cards on PricingPage: grid-cols-2 (Enterprise wraps below on tablet)

Desktop (> 1024px):
  Sidebar: full 240px sidebar
  Dashboard: lg:grid-cols-3 (main + sidebar)
  Agent grid: grid-cols-4
  Report tabs: all visible without scroll
  Plan cards: grid-cols-3
```

### Sidebar

```
// src/components/layout/Sidebar.tsx

Tell vibe coder:

Desktop sidebar: fixed left-0 top-0 bottom-0, z-20
  Width: transition between 240px (expanded) and 64px (collapsed)
  Use Framer Motion: motion.aside animate={{ width: collapsed ? 64 : 240 }}
  Overflow: hidden when collapsed (so labels fade out)

When collapsed:
  Show only icons (Lucide), no text labels
  Tooltips (Bits UI Tooltip) on each icon explaining the nav item
  Toggle button at bottom: Lucide ChevronsLeft / ChevronsRight
  Click expands/collapses (useUIStore.toggleSidebar)

Mobile sidebar (< lg): not rendered in DOM
  Topbar has Lucide Menu button
  On click: opens Bits UI Sheet from the left (overlay drawer)
  Sheet content: full sidebar component
  Close on navigation

Nav items:
  Dashboard (Lucide LayoutDashboard)
  New Report (Lucide Plus, brand purple highlight)
  Reports (Lucide FileText)
  Sentiment (Lucide Activity) — show "Pro" badge when user is free
  Prices (Lucide TrendingUp) — show "Pro" badge when user is free
  Settings (Lucide Settings2)

Active state: bg-brand-50 text-brand-800, left border accent: border-l-2 border-brand-500
Inactive: text-ink-secondary hover:bg-surface-2 hover:text-ink-primary

At bottom of sidebar: user avatar + plan badge + "Upgrade" link if free
```

---

## 28. Environment Variables

```bash
# frontend/.env.example
# Copy to .env and fill all values

# Supabase — use ANON key in frontend (NOT service key)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend API base URL
VITE_API_URL=http://localhost:8000
# Production: VITE_API_URL=https://api.productiq.in

# Razorpay — PUBLIC key ONLY in frontend
VITE_RAZORPAY_KEY_ID=rzp_test_...
# Production: VITE_RAZORPAY_KEY_ID=rzp_live_...

# PostHog frontend analytics
VITE_POSTHOG_API_KEY=phc_...
VITE_POSTHOG_HOST=https://app.posthog.com

# App
VITE_APP_ENV=development
VITE_APP_URL=http://localhost:5173
```

### PostHog Integration
```
// src/main.tsx — Initialize PostHog

import posthog from 'posthog-js'

posthog.init(import.meta.env.VITE_POSTHOG_API_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  capture_pageview: false,         // handle manually in router
  persistence: 'localStorage',
  autocapture: true,               // captures clicks, forms automatically
})

// In App.tsx — track page views on route change:
const location = useLocation()
useEffect(() => {
  posthog.capture('$pageview', { path: location.pathname })
}, [location.pathname])

// In useAuth — identify user after login:
posthog.identify(user.id, {
  email: user.email,
  plan: profile.plan,
  company: profile.company_name,
  created_at: profile.created_at,
})

// Key events to capture across pages:
posthog.capture('report_started', { category, plan })
posthog.capture('report_completed', { duration_seconds })
posthog.capture('report_downloaded', { format: 'pdf' | 'pptx' })
posthog.capture('upgrade_clicked', { from_page, current_plan })
posthog.capture('referral_link_copied')
posthog.capture('knowledge_graph_viewed', { run_id })
posthog.capture('checkout_opened', { plan })
posthog.capture('payment_completed', { plan, amount })
```

---

## 29. Build & Deployment

### Development

```bash
# Install
npm install

# Start dev server (proxies /api to :8000)
npm run dev
# → http://localhost:5173

# Type check (no emit)
npx tsc --noEmit

# Lint
npm run lint

# Build production bundle
npm run build
# Output: dist/
```

### Vercel Deployment

```bash
# Install CLI
npm install -g vercel

# From frontend/ directory
vercel

# Link to project, set environment variables in Vercel Dashboard:
# Project → Settings → Environment Variables
# Add all VITE_* variables matching your .env

# Deploy to production
vercel --prod
```

```json
// vercel.json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.productiq.in/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### Performance Checklist Before Launch

```
[ ] Bundle analysis: npx vite-bundle-analyzer (check for large deps)
[ ] Image optimization: logo.svg is already vector, no raster images needed
[ ] Font loading: Inter preconnect in index.html (already in Section 4)
[ ] Lazy loading: heavy pages (KnowledgeGraph, ReportView) with React.lazy + Suspense
[ ] No console.log in production: configure via lint rules
[ ] Sentry setup (optional): npm install @sentry/react, init with VITE_SENTRY_DSN
[ ] Lighthouse score target: Performance >90, Accessibility >95
```

---

## 30. Frontend Build Order (Week 5–8)

### Week 5, Days 1–2: Foundation (do not skip steps)

```
Day 1:
[ ] Vite project created, dependencies installed
[ ] Tailwind configured with custom tokens (Section 4)
[ ] Inter font loaded
[ ] cn() utility created
[ ] Supabase client created
[ ] useAuth hook + AuthContext working

Day 2:
[ ] React Router routes defined (all pages as <div>placeholders</div>)
[ ] AppShell with sidebar (even if nav items just log clicks)
[ ] LoginPage fully working — can sign in and out
[ ] SignupPage fully working — can create account
[ ] useProfile hook returning plan data
[ ] ProtectedRoute working (redirect to /login when unauthed)

VERIFY: Sign up, see AppShell, log out, get redirected to login.
```

### Week 5, Days 3–5: New Report → Run Status (core loop)

```
Day 3:
[ ] DashboardPage with stats (mocked data fine), usage meter, empty runs list
[ ] NewReportPage form with all fields and validation
[ ] useStartRun mutation calling backend
[ ] API client configured with auth interceptor

Day 4:
[ ] useAgentStream SSE hook
[ ] RunStatusPage layout and agent grid (pending state for all cards)
[ ] AgentCard component (all 4 visual states)
[ ] Agent cards update in real time from SSE events

Day 5:
[ ] Completion section on RunStatusPage (PDF + PPTX download buttons)
[ ] Confetti on completion
[ ] useRun polling fallback when SSE disconnects
[ ] RunCard component on Dashboard list
[ ] Live log section (collapsed accordion)

VERIFY: Start report from browser. Watch 8 agents activate. See completion screen. Confetti fires.
THIS IS THE DEMO. If this works impressively, you have a product.
```

### Week 6: Report Display

```
[ ] useReport hook fetching all report data from Supabase
[ ] ReportViewPage with Bits UI Tabs
[ ] InsightCard (10+ insights displaying)
[ ] ClusterBubbleChart (Recharts scatter)
[ ] CompetitorTable with expandable rows
[ ] TrendVelocityChart
[ ] ConceptCard (validation score ring)
[ ] GTM Plan section
[ ] PDF + PPTX download working (signed URLs from Supabase Storage)
[ ] CompetitorRadar chart

VERIFY: Full completed report displays in all 6 tabs with real data.
```

### Week 7: Pro Features + Knowledge Graph

```
[ ] SentimentPage with SentimentGauge SVG
[ ] useRealtimeSentiment hook + Supabase Realtime
[ ] Live score updates visible without page refresh
[ ] PricePage with PriceTrendChart
[ ] PriceTrendChart with reference line for optimal price
[ ] KnowledgeGraphPage with react-force-graph-2d
[ ] Node colors, edge colors, filter checkboxes
[ ] Detail sidebar on node click
[ ] PlanGate component with blur + upgrade overlay
[ ] PlanRoute guard for /sentiment and /prices

VERIFY: Sentiment updates in real time. Knowledge graph renders. Pro features locked for free users.
```

### Week 8: Payments, Polish, Launch

```
[ ] PricingPage with 3 cards and billing toggle
[ ] Razorpay checkout integration end-to-end
[ ] SettingsPage (all 4 tabs)
[ ] Referral copy button with animation
[ ] Responsive pass: mobile sidebar drawer (Bits UI Sheet)
[ ] Responsive pass: agent grid 2-col on mobile
[ ] Skeleton loading for all pages
[ ] EmptyState for zero-data scenarios
[ ] ErrorState for failed fetches
[ ] PostHog events wired up on all key actions
[ ] Sonner toasts on all mutations
[ ] Bundle optimization (manualChunks, lazy imports for graph page)
[ ] vercel.json configured

FINAL VERIFY: End-to-end on mobile: sign up → new report → watch agents → download PDF → see pricing → upgrade.
```

---

## Appendix: Vibe Coding Prompt Templates

Use these as starting prompts in Cursor, Windsurf, or any AI IDE:

### New page
```
Build [PageName] in TypeScript React.

URL: [url]
Data: fetched via [hook name] using TanStack Query
Guard: [none | ProtectedRoute | PlanRoute('pro')]

Layout: [describe layout — max-w, grid, padding]

Sections:
1. [Describe section 1 — heading, content, visual]
2. [Describe section 2]
3. [etc.]

Styling rules:
- Tailwind CSS only, no inline styles
- Use cn() from lib/utils for class merging
- Colors: follow design token rules from Section 5
- Animations: only patterns from Section 6 (name the pattern)

Components to use: [list from Section 20]
```

### New component
```
Build a React component [ComponentName].tsx in TypeScript.

Props: [list all props with types]

Visual: [describe exactly what it looks like in each state]
Interactions: [describe hover, click, keyboard behavior]

Styling: Tailwind CSS only.
Icons: Lucide React ([list icons needed]).
Animation: Framer Motion — use [pattern name from Section 6].

Export: export default memo([ComponentName])
```

### Adding animation to existing component
```
Add Framer Motion animation to [ComponentName]:

Animation type: [name from Section 6 — e.g. "slide-up-fade entrance", "stagger-children"]
Trigger: [on mount | on data load | on status change | on click]
Duration: [Xms]
Target elements: [describe which elements animate]

Do not change any existing functionality or styling.
Import motion from 'motion/react'.
Use AnimatePresence if the element can be conditionally added/removed.
```

### Connecting Supabase Realtime
```
Add Supabase Realtime to [PageName] or [HookName].

Subscribe to:
  Event: [INSERT | UPDATE | DELETE]
  Table: [table_name]
  Filter: [column=eq.value]

When event fires:
  1. [describe state update]
  2. [describe UI response]
  3. [describe toast if needed]

Show a [green | amber] dot + "[Live | Polling]" label while [connected | disconnected].
Clean up the channel subscription on component unmount.
Use supabase from lib/supabase.ts.
```

### Adding a Recharts chart
```
Build [ChartName] component using Recharts.

Data prop shape: [describe the array shape]
Chart type: [AreaChart | LineChart | RadarChart | ScatterChart | PieChart]
Height: [Npx — rendered inside ResponsiveContainer width="100%"]

Axes: [describe x-axis and y-axis data keys, formatters]
Series: [describe each data series — color, type, fill]
Reference lines: [if any]
Tooltip: [custom or default — describe what it shows]
Legend: [position, content]

Colors: use brand-400 (#7F77DD) as primary, coral-400 (#D85A30) as secondary.
Grid: horizontal lines only, stroke="#EDEBE8".
Animation: isAnimationActive={true}, animationDuration=800.
```

---

*ProductIQ — Part 2: Frontend & Utils Vibe Coding Guide*
*Stack: React 18 · Vite · Tailwind CSS v3 · Bits UI · Framer Motion v11 · Recharts · React Force Graph · TanStack Query v5 · Supabase JS v2 · Sonner · AutoAnimate · canvas-confetti*
*Companion to Part 1: Backend, Agents & Architecture Guide*
