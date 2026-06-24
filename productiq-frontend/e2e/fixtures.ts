/**
 * Playwright Test Fixtures
 *
 * Provides:
 * - `mockPage`: A page with all API calls intercepted and mock auth injected
 * - `authedPage`: A page that's already logged in and on the dashboard
 */
import { test as base, type Page } from '@playwright/test'

// ── Mock auth session (injected into localStorage) ───────────────
// Supabase v2 stores sessions with key: sb-<project-ref>-auth-token
// For https://placeholder.supabase.co, the ref is "placeholder"
const MOCK_SESSION = {
  access_token: 'mock-access-token-test',
  refresh_token: 'mock-refresh-token-test',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: {
    id: 'test-user-001',
    email: 'test@productiq.dev',
    user_metadata: { full_name: 'Test User', company_name: 'TestCo' },
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'email' },
    created_at: new Date().toISOString(),
  },
}

// The storage key matches what supabase-js v2 uses for https://placeholder.supabase.co
const SUPABASE_KEY = 'sb-placeholder-auth-token'
const SUPABASE_VALUE = JSON.stringify(MOCK_SESSION)

// ── Mock data (inline for page.route) ─────────────────────────────
const mockData = {
  runs: [
    { id: 'run-001', user_id: 'test-user-001', product_category: 'Whey Protein', brand_name: 'TestBrand', target_market: 'India', status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString(), duration_seconds: 612 },
    { id: 'run-002', user_id: 'test-user-001', product_category: 'Plant Protein', brand_name: null, target_market: 'India', status: 'completed', created_at: new Date(Date.now() - 172800000).toISOString(), duration_seconds: 545 },
  ],
  insights: [
    { id: 'i1', run_id: 'run-001', insight_type: 'market_gap', title: 'Sugar-free segment is underserved', body: 'Only 2 of 18 SKUs offer sugar-free formulation.', confidence_score: 0.87, sources: null, created_at: new Date().toISOString() },
    { id: 'i2', run_id: 'run-001', insight_type: 'consumer_need', title: 'Digestibility is the #1 purchase driver', body: '62% of converting reviews cite digestibility.', confidence_score: 0.81, sources: null, created_at: new Date().toISOString() },
  ],
  competitors: [
    { id: 'c1', run_id: 'run-001', brand_name: 'MuscleBlaze', product_name: 'Biozyme', platform: 'amazon', price_inr: 2499, rating: 4.3, review_count: 14200, key_strengths: ['Patented enzyme blend'], key_weaknesses: ['No lab reports'], positioning_statement: null, url: null },
    { id: 'c2', run_id: 'run-001', brand_name: 'Optimum Nutrition', product_name: 'Gold Standard', platform: 'amazon', price_inr: 4299, rating: 4.6, review_count: 9800, key_strengths: ['Global trust'], key_weaknesses: ['Premium pricing'], positioning_statement: null, url: null },
  ],
  clusters: [
    { id: 'cl1', run_id: 'run-001', topic_id: 1, topic_label: 'Aftertaste', topic_type: 'pain_point', representative_words: ['sweet', 'artificial'], review_count: 312, avg_sentiment: -0.62, sample_reviews: ['Too sweet.'] },
    { id: 'cl2', run_id: 'run-001', topic_id: 2, topic_label: 'Mixability', topic_type: 'praise', representative_words: ['mixes', 'smooth'], review_count: 189, avg_sentiment: 0.78, sample_reviews: ['Mixes perfectly.'] },
  ],
  concepts: [
    { id: 'con1', run_id: 'run-001', concept_name: 'ClearWhey Sugar-Free', tagline: 'The first whey your dietitian approves.', target_persona: '25-40 professionals', usp: 'Zero sugar, lab tested.', key_features: ['Zero sugar', 'Lab QR'], suggested_price_inr: 2299, price_rationale: 'Premium', gap_it_fills: 'Sugar-free gap', market_size_estimate: '₹80cr', risks: ['FSSAI lead time'], name_ideas: ['ClearWhey', 'PureForm'], validation_score: 83, created_at: new Date().toISOString() },
  ],
  gtm: [
    { id: 'gtm1', run_id: 'run-001', concept_id: 'con1', launch_channels: ['Amazon PPC', 'Influencers'], messaging_framework: {}, pricing_strategy: {}, influencer_targets: {}, launch_timeline: { phases: [{ week: 'Week 1-2', phase: 'Foundation', items: ['Finalise claims'] }] }, budget_estimate: { total: '₹4.02L' }, created_at: new Date().toISOString() },
  ],
  notifications: [
    { id: 'n1', type: 'info', severity: 'info', title: 'Report completed: Whey Protein', body: 'Your analysis is ready.', brandName: 'report', brand: 'Report', category: 'REPORT', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false, actionUrl: '/reports/run-001', actionLabel: 'View' },
    { id: 'n2', type: 'alert.price_change', severity: 'warning', title: 'Competitor price drop', body: 'MuscleBlaze dropped 15%.', brandName: 'intelligence', brand: 'Intelligence', category: 'ALERT', timestamp: new Date(Date.now() - 7200000).toISOString(), isRead: false, actionUrl: '/intelligence', actionLabel: 'View' },
    { id: 'n3', type: 'intelligence.insight_ready', severity: 'info', title: 'Payment successful', body: 'Pro plan active.', brandName: 'billing', brand: 'Billing', category: 'SYSTEM', timestamp: new Date(Date.now() - 86400000).toISOString(), isRead: true, actionUrl: '/settings', actionLabel: 'View' },
  ],
  brands: [
    { id: 'b1', brandName: 'MuscleBlaze', productCategory: 'Whey Protein', targetMarket: 'India', monitoringEnabled: true, trackingSince: new Date(Date.now() - 86400000).toISOString(), lastFullRunAt: new Date().toISOString(), healthScore: 72, healthDelta: 2, sentimentTrend: [0.5, 0.54, 0.48, 0.52], priceTrend: [2499, 2499, 2399, 2499], competitors: ['Optimum Nutrition'], alertThresholds: { sentimentDrop: 0.1, priceChange: 0.15, mentionSpike: 50 }, plan: 'pro', totalRuns: 3 },
    { id: 'b2', brandName: 'Optimum Nutrition', productCategory: 'Whey Protein', targetMarket: 'India', monitoringEnabled: true, trackingSince: new Date(Date.now() - 172800000).toISOString(), lastFullRunAt: new Date().toISOString(), healthScore: 85, healthDelta: -1, sentimentTrend: [0.7, 0.72, 0.68, 0.71], priceTrend: [4299, 4299, 4299, 4299], competitors: ['MuscleBlaze'], alertThresholds: { sentimentDrop: 0.1, priceChange: 0.15, mentionSpike: 50 }, plan: 'pro', totalRuns: 2 },
  ],
  intelEvents: [
    { id: 'ie1', type: 'alert.competitor_launch', severity: 'warning', title: 'MuscleBlaze launched sugar-free variant', body: 'New SKU detected on Amazon with sugar-free positioning.', brandId: 'b1', brandName: 'MuscleBlaze', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false, payload: { source: 'amazon' } },
    { id: 'ie2', type: 'alert.trend_breakout', severity: 'info', title: 'Collagen protein trending +180% YoY', body: 'Google Trends shows massive surge in collagen protein interest.', brandId: 'b2', brandName: 'Optimum Nutrition', timestamp: new Date(Date.now() - 7200000).toISOString(), isRead: false, payload: { source: 'google_trends' } },
  ],
  chatSessions: [
    { id: 'cs1', user_id: 'test-user-001', title: 'What are the top market gaps?', run_id: 'run-001', created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString() },
  ],
  chatMessages: [
    { id: 'm1', session_id: 'cs1', role: 'user', content: 'What are the top market gaps?', metadata: {}, created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'm2', session_id: 'cs1', role: 'assistant', content: 'The top market gap is the sugar-free segment.', metadata: { source: 'rag' }, created_at: new Date(Date.now() - 3500000).toISOString() },
  ],
  sentiment: {
    scores: [
      { id: 's1', brand_name: 'MuscleBlaze', score: 0.54, platform: 'amazon', positive_pct: 62, neutral_pct: 24, negative_pct: 14, total_mentions: 14200, scored_at: new Date(Date.now() - 3600000).toISOString(), alert_sent: false },
    ],
    total: 1,
  },
  products: [
    { id: 'p1', run_id: 'run-001', platform: 'amazon', product_name: 'MuscleBlaze Biozyme', brand: 'MuscleBlaze', category: 'Whey', price_inr: 2499, mrp_inr: 2999, rating: 4.3, review_count: 14200, in_stock: true, images: [], url: 'https://amazon.in/1', scraped_at: new Date().toISOString() },
  ],
  profile: { id: 'test-user-001', email: 'test@productiq.dev', full_name: 'Test User', company_name: 'TestCo', plan: 'pro', role: 'admin', reports_used: 5, reports_limit: 50, slack_webhook_url: null },
  payments: { transactions: [{ id: 't1', amount_paise: 499900, created_at: new Date(Date.now() - 86400000).toISOString(), plan: 'pro', type: 'subscription', status: 'paid' }], total: 1 },
  graph: { nodes: [{ id: 'n1', type: 'brand', name: 'MuscleBlaze', category: 'Whey', mentions: 14200, trend: 'stable' }], edges: [] },
  validationResult: {
    validation_id: 'v1', status: 'completed',
    result: { market_fit: 82, differentiation: 75, feasibility: 68, overall_score: 75, summary: 'Strong market fit.', strengths: ['Clear gap'], risks: ['Regulatory'], recommendations: ['Focus on sugar-free'] },
  },
  // ── Admin mock data ──
  adminStats: {
    users: { total: 42, new_7d: 7, by_plan: { free: 25, pro: 12, enterprise: 5 } },
    runs: { total: 156, completed: 140, failed: 8, running: 3, new_7d: 22 },
    revenue: { total_paise: 4999000, total_inr: 49990, revenue_7d_paise: 999900, revenue_7d_inr: 9999, transaction_count: 15 },
    notifications: { total: 89 },
    intelligence: { total_events: 34, critical_events: 3 },
  },
  adminUsers: {
    users: [
      { id: 'u1', email: 'alice@example.com', full_name: 'Alice Sharma', company_name: 'AcmeCorp', plan: 'pro', role: 'user', reports_used_this_month: 12, reports_limit: 50, created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: new Date().toISOString() },
      { id: 'u2', email: 'bob@example.com', full_name: 'Bob Verma', company_name: 'BetaInc', plan: 'free', role: 'user', reports_used_this_month: 2, reports_limit: 3, created_at: new Date(Date.now() - 86400000 * 15).toISOString(), updated_at: new Date().toISOString() },
      { id: 'u3', email: 'carol@example.com', full_name: 'Carol Singh', company_name: 'Gamma LLC', plan: 'enterprise', role: 'admin', reports_used_this_month: 45, reports_limit: 500, created_at: new Date(Date.now() - 86400000 * 60).toISOString(), updated_at: new Date().toISOString() },
      { id: 'u4', email: 'dan@example.com', full_name: 'Dan Reddy', company_name: null, plan: 'pro', role: 'user', reports_used_this_month: 30, reports_limit: 50, created_at: new Date(Date.now() - 86400000 * 7).toISOString(), updated_at: new Date().toISOString() },
    ],
    total: 42, offset: 0, limit: 20,
  },
  adminHealth: {
    redis: { status: 'healthy', latency_ms: 2.3 },
    celery: { status: 'healthy', queues: { pipeline: 2, monitoring: 0, default: 0 } },
    llm: { status: 'healthy', keys_available: 3 },
    database: { status: 'healthy' },
  },
  adminRevenue: {
    daily: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10),
      revenue_paise: Math.floor(Math.random() * 500000) + 50000,
      count: Math.floor(Math.random() * 3) + 1,
    })),
    plan_revenue_paise: { free: 0, pro: 2999000, enterprise: 2000000 },
    total_revenue_paise: 4999000,
    total_transactions: 15,
    avg_transaction_paise: 333266,
  },
  adminRuns: {
    daily: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10),
      total: Math.floor(Math.random() * 8) + 2,
      completed: Math.floor(Math.random() * 6) + 2,
      failed: Math.floor(Math.random() * 2),
    })),
    categories: [['Whey Protein', 45], ['Plant Protein', 22], ['Snacks', 18], ['Beverages', 12]],
    total: 156, completed: 140, failed: 8, success_rate: 89.7,
  },
  adminAuditLog: {
    entries: [
      { id: 'a1', admin_id: 'u3', action: 'user.plan_change', target_id: 'u1', target_type: 'user', details: { new_plan: 'pro' }, created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 'a2', admin_id: 'u3', action: 'user.role_change', target_id: 'u1', target_type: 'user', details: { new_role: 'admin' }, created_at: new Date(Date.now() - 7200000).toISOString() },
    ],
    total: 2, offset: 0, limit: 50,
  },
}

// ── Route interceptor ─────────────────────────────────────────────
async function setupApiMocking(page: Page) {
  const API = /\/api\//

  await page.route(API, async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    const path = new URL(url).pathname.replace('/api', '')

    // Helper to respond with JSON
    const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })

    // ── Reports ──
    if ((path === '/reports' || path === '/reports/') && method === 'GET') return json({ runs: mockData.runs, total: mockData.runs.length })
    if (path === '/reports/run' && method === 'POST') return json({ run_id: 'run-new', status: 'queued' })
    if (path.match(/^\/reports\/[\w-]+$/) && method === 'GET') {
      const runId = path.split('/')[2]
      const run = mockData.runs.find(r => r.id === runId)
      if (!run) return json(null, 404)
      return json({ run, report: { id: 'r1', run_id: runId, title: `${run.product_category} Intelligence`, pdf_url: null, pptx_url: null, is_watermarked: false, page_count: 24, created_at: run.created_at }, insights: mockData.insights, clusters: mockData.clusters, competitors: mockData.competitors, trends: [], concepts: mockData.concepts, gtmPlans: mockData.gtm })
    }
    if (path.match(/^\/reports\/[\w-]+\/insights$/)) return json({ insights: mockData.insights, total: mockData.insights.length })
    if (path.match(/^\/reports\/[\w-]+\/concepts$/)) return json({ concepts: mockData.concepts, total: mockData.concepts.length })
    if (path.match(/^\/reports\/[\w-]+\/gtm$/)) return json({ gtmPlans: mockData.gtm, total: mockData.gtm.length })
    if (path.match(/^\/reports\/[\w-]+\/clusters$/)) return json({ clusters: mockData.clusters, total: mockData.clusters.length })
    if (path.match(/^\/reports\/[\w-]+\/competitors$/)) return json({ competitors: mockData.competitors, total: mockData.competitors.length })

    // ── Profile ──
    if (path === '/profile' && method === 'GET') return json(mockData.profile)
    if (path === '/profile' && method === 'PATCH') return json(mockData.profile)
    if (path === '/profile/usage') return json({ reports_used: 5, reports_limit: 50 })

    // ── Payments ──
    if (path === '/payments/history') return json(mockData.payments)

    // ── Sentiment ──
    if (path === '/sentiment' || path === '/sentiment/') return json(mockData.sentiment)
    if (path === '/sentiment/latest') return json({ scores: mockData.sentiment.scores.slice(0, 1) })

    // ── Graph ──
    if (path.match(/^\/graph\/[\w-]+$/)) return json(mockData.graph)

    // ── Products ──
    if (path.match(/^\/products\/[\w-]+\/products$/)) return json({ products: mockData.products, total: mockData.products.length })
    if (path.match(/^\/products\/[\w-]+\/clusters$/)) return json({ clusters: mockData.clusters, total: mockData.clusters.length })
    if (path.match(/^\/products\/[\w-]+\/competitors$/)) return json({ competitors: mockData.competitors, total: mockData.competitors.length })

    // ── V2: Notifications ──
    if (path === '/v2/notifications' && method === 'GET') {
      const unreadOnly = new URL(url).searchParams.get('unread_only') === 'true'
      const notifs = unreadOnly ? mockData.notifications.filter(n => !n.read) : mockData.notifications
      return json({ notifications: notifs, total: notifs.length })
    }
    if (path.match(/^\/v2\/notifications\/[\w-]+\/read$/) && method === 'PATCH') return json({ updated: true })
    if (path === '/v2/notifications/read-all' && method === 'PATCH') return json({ updated: true })
    if (path === '/v2/notifications/unread-count') return json({ count: mockData.notifications.filter(n => !n.isRead).length })

    // ── V2: Intelligence ──
    if (path === '/v2/intelligence/events') return json({ events: mockData.intelEvents, total: mockData.intelEvents.length })
    if (path === '/v2/intelligence/brands') return json({ brands: mockData.brands.map(b => ({ id: b.id, brandName: b.brandName })) })

    // ── V2: Brands ──
    if (path === '/v2/brands' && method === 'GET') return json({ brands: mockData.brands })
    if (path === '/v2/brands' && method === 'POST') return json({ brand: { ...mockData.brands[0], id: 'b-new', brand_name: 'NewBrand' } })
    if (path.match(/^\/v2\/brands\/[\w-]+$/) && method === 'DELETE') return json({ deleted: true })

    // ── V2: Chat ──
    if (path === '/v2/chat/sessions' && method === 'GET') return json({ sessions: mockData.chatSessions })
    if (path.match(/^\/v2\/chat\/sessions\/[\w-]+\/messages$/)) return json({ messages: mockData.chatMessages })
    if (path === '/v2/chat/message' && method === 'POST') return json({ session_id: 'cs1', answer: 'The top market gap is the sugar-free segment.', source: 'rag' })
    if (path.match(/^\/v2\/chat\/sessions\/[\w-]+$/) && method === 'DELETE') return json({ deleted: true })

    // ── V2: Compare ──
    if (path.match(/^\/v2\/compare\/[\w-]+\/[\w-]+$/)) return json({
      id: 'compare-001',
      baseRunId: 'run-001',
      compareRunId: 'run-002',
      baseName: 'Whey Protein',
      compareName: 'Plant Protein',
      createdAt: new Date().toISOString(),
      newInsights: [
        { id: 'ni1', type: 'market_gap', text: 'Plant-based segment growing 3x faster', impact: 'high' },
        { id: 'ni2', type: 'consumer_need', text: 'Sustainability is top driver for plant protein', impact: 'medium' },
      ],
      removedInsights: ['Sugar-free segment is underserved'],
      competitorChanges: [
        { name: 'MuscleBlaze', change: 'Launched plant protein line', type: 'launch' },
        { name: 'MyProtein', change: 'Entered market', type: 'entry' },
      ],
      trendVelocityChanges: [
        { trend: 'plant-protein', before: 45, after: 82, delta: 37 },
        { trend: 'sugar-free', before: 28, after: 22, delta: -6 },
      ],
      priceShifts: [
        { product: 'MuscleBlaze Whey 1kg', before: 2499, after: 2199, pct: -12 },
      ],
      summary: 'Plant protein is emerging as the fastest-growing segment while whey protein shows signs of saturation in the sugar-free sub-segment.',
    })

    // ── V2: Validate ──
    if (path === '/v2/validate' && method === 'POST') return json(mockData.validationResult)
    if (path === '/v2/validate/history') return json({ validations: [{ id: 'v1', concept_name: 'ClearWhey', overall_score: 75, status: 'completed', created_at: new Date().toISOString() }] })

    // ── Admin endpoints ──
    if (path === '/admin/stats') return json(mockData.adminStats)
    if (path === '/admin/users') return json(mockData.adminUsers)
    if (path === '/admin/health') return json(mockData.adminHealth)
    if (path === '/admin/revenue') return json(mockData.adminRevenue)
    if (path === '/admin/runs') return json(mockData.adminRuns)
    if (path === '/admin/audit-log') return json(mockData.adminAuditLog)
    if (path.match(/^\/admin\/users\/[\w-]+\/plan$/) && method === 'PATCH') return json({ updated: true })
    if (path.match(/^\/admin\/users\/[\w-]+\/role$/) && method === 'PATCH') return json({ updated: true })

    // ── Fallback: pass through ──
    return route.continue()
  })
}

// ── Inject mock auth into localStorage ────────────────────────────
// In E2E test mode (VITE_E2E_TEST=true), the useAuth hook bypasses
// Supabase entirely and returns a mock user. So we don't need to
// inject anything into localStorage. We just need to intercept
// any Supabase API calls so they don't fail.
async function injectMockAuth(page: Page) {
  // Intercept ALL Supabase API calls and return empty success
  // (the app won't use these in E2E test mode, but just in case)
  await page.route(/placeholder\.supabase\.co/, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    })
  })
}

// ── Custom fixtures ───────────────────────────────────────────────
export const test = base.extend<{ mockPage: Page; authedPage: Page }>({
  mockPage: async ({ page }, use) => {
    await setupApiMocking(page)
    await use(page)
  },
  authedPage: async ({ page }, use) => {
    await setupApiMocking(page)
    await injectMockAuth(page)
    // Navigate to dashboard — addInitScript will set localStorage before app loads
    await page.goto('/dashboard')
    // Wait for the page to settle (lazy-loaded chunks + API calls)
    await page.waitForLoadState('domcontentloaded')
    await use(page)
  },
})

export { expect } from '@playwright/test'
