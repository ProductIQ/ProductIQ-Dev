# ProductIQ Frontend

React 19 + Vite 8 + TypeScript frontend for the ProductIQ AI product intelligence platform.

## Tech Stack

- **React 19** with TypeScript
- **Vite 8** (build tool + dev server)
- **Tailwind CSS** (styling)
- **TanStack Query 5** (server state / data fetching)
- **React Router 6** (routing with lazy-loaded routes)
- **Motion** (animations)
- **Recharts** (charts)
- **Supabase JS** (auth + realtime subscriptions)
- **Axios** (HTTP client with interceptors)
- **Sonner** (toast notifications)
- **Sentry React** (error tracking + performance)
- **Zustand** (UI state)

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# Start dev server (proxies /api to localhost:8000)
npm run dev
```

Visit `http://localhost:5173`.

## Build

```bash
# TypeScript check + Vite build
npm run build

# Preview the production build
npm run preview
```

## Testing

```bash
# Run all E2E tests (starts preview server automatically)
npm run test:e2e

# Interactive UI mode (debug tests visually)
npm run test:e2e:ui

# View HTML test report
npm run test:e2e:report
```

The E2E tests use Playwright with a mock API layer (no backend needed). Tests run in headless Chromium.

## Project Structure

```
src/
├── main.tsx                  # App entry — Sentry init + ErrorBoundary
├── App.tsx                   # Routes (lazy-loaded) + page transitions
├── pages/                    # Route components
│   ├── LandingPage.tsx       # Public landing page
│   ├── LoginPage.tsx         # Auth pages
│   ├── SignupPage.tsx
│   ├── DashboardPage.tsx     # Protected pages (lazy-loaded)
│   ├── NewReportPage.tsx     # Report creation form
│   ├── ReportViewPage.tsx    # Report viewer with tabs
│   ├── IntelligencePage.tsx  # Live intelligence feed
│   ├── NotificationsPage.tsx # Notification hub
│   ├── BrandsPage.tsx        # Brand profile management
│   ├── ChatPage.tsx          # AI chat interface
│   ├── ComparePage.tsx       # Run comparator
│   ├── ValidatePage.tsx      # Concept validator
│   ├── AdminPage.tsx         # Admin dashboard
│   ├── SettingsPage.tsx      # User settings + billing
│   └── ...
├── components/layout/
│   ├── AppShell.tsx          # Layout wrapper (Sidebar + Topbar + content)
│   ├── Sidebar.tsx           # Navigation sidebar (admin link conditional)
│   └── Topbar.tsx            # Top bar with breadcrumb + notification badge
├── hooks/
│   ├── useAuth.ts            # Supabase auth + profile management
│   └── useRealtime.ts        # Supabase Realtime subscriptions
├── lib/
│   ├── api.ts                # Axios instance + all API functions
│   ├── supabase.ts           # Supabase client
│   ├── sentry.ts             # Sentry initialization + helpers
│   └── queryClient.ts        # TanStack Query client config
├── types/
│   └── user.ts               # Profile, Transaction, AuthUser types
└── stores/
    └── useUIStore.ts         # Zustand store (sidebar state)
```

## Routing

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/login`, `/signup` | Public | Authentication |
| `/pricing` | Public | Pricing page |
| `/dashboard` | Auth | Dashboard with run history |
| `/reports/new` | Auth | Create new report |
| `/reports/:runId` | Auth | View report (tabs: overview, competitors, concepts, GTM) |
| `/intelligence` | Auth | Live intelligence feed (realtime) |
| `/brands` | Auth | Brand profile management |
| `/notifications` | Auth | Notification hub (realtime) |
| `/chat` | Pro+ | AI chat assistant |
| `/compare` | Auth | Compare two runs side-by-side |
| `/validate` | Pro+ | Concept validator |
| `/sentiment` | Pro+ | Brand sentiment tracking |
| `/prices` | Pro+ | Price tracker |
| `/knowledge` | Auth | Knowledge graph |
| `/settings` | Auth | User settings + billing |
| `/admin` | Admin | Admin dashboard (role='admin' required) |

## Code Splitting

Routes are lazy-loaded via `React.lazy()` with vendor chunk splitting:

- `react-vendor` — React, ReactDOM, React Router
- `charts` — Recharts
- `query` — TanStack Query
- `supabase` — Supabase JS
- `sentry` — Sentry React
- `motion` — Motion (animations)
- Individual route chunks loaded on-demand

## Realtime Subscriptions

The frontend uses Supabase Realtime for live updates:

- **Notifications** — `useRealtimeNotifications()` subscribes to INSERT/UPDATE on the notifications table. New notifications trigger a toast + update the unread badge.
- **Intelligence Events** — `useRealtimeIntelEvents()` subscribes to INSERT on the intelligence_events table. The "Live/Paused" toggle controls the subscription.
- **Unread Badge** — `useUnreadCount()` polls every 30s as a fallback + invalidates on realtime events.

## Error Tracking

Sentry is initialized in `main.tsx` (no-op if `VITE_SENTRY_DSN` is not set):

- **ErrorBoundary** wraps the entire app with a fallback UI
- **Browser tracing** creates transactions for route changes
- **Session replay** captures user sessions for debugging
- **API breadcrumbs** — all axios calls are logged as breadcrumbs
- **User context** — set on login, cleared on logout
- **5xx errors** captured automatically; 4xx ignored (expected client errors)

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key (safe for browser) |
| `VITE_API_URL` | Yes | `/api` (dev proxy) or full backend URL |
| `VITE_RAZORPAY_KEY_ID` | Yes | Razorpay Key ID (publishable) |
| `VITE_SENTRY_DSN` | Optional | Sentry DSN (empty = disabled) |
| `VITE_SENTRY_ENVIRONMENT` | Optional | Sentry environment tag |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Optional | Trace sampling (default: 0.1) |
| `VITE_E2E_TEST` | CI only | Set to `true` in E2E tests (bypasses Supabase auth) |

## E2E Test Architecture

E2E tests run without a backend or Supabase:

- `VITE_E2E_TEST=true` bypasses Supabase auth (injects mock user)
- `e2e/fixtures.ts` intercepts all `/api/` calls with mock data
- Mock data covers all 20+ API endpoints (reports, notifications, intel, admin, etc.)
- Tests run against `vite preview` (production build) on port 4173

Test files:
- `e2e/tests/landing.spec.ts` — Landing page + navigation
- `e2e/tests/auth.spec.ts` — Auth flow (login, signup, guard)
- `e2e/tests/dashboard.spec.ts` — Dashboard + report creation + view
- `e2e/tests/v2-features.spec.ts` — Notifications, intel, brands, chat, validate, compare
- `e2e/tests/settings.spec.ts` — Settings + billing
- `e2e/tests/admin.spec.ts` — Admin dashboard (all 4 tabs)
- `e2e/tests/error-boundary.spec.ts` — ErrorBoundary verification
