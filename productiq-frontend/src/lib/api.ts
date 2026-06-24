// src/lib/api.ts
// ════════════════════════════════════════════════════════════════
// MOCK API LAYER — all functions return mock data via timers.
// Swap implementations for real axios calls when backend is ready.
// ════════════════════════════════════════════════════════════════
import type { AgentRun } from '@/types/agent'

/** Simulate network delay */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// ── Mock data ──────────────────────────────────────────────────
export const MOCK_RUNS: AgentRun[] = [
  {
    id: 'run-001',
    user_id: 'mock-user',
    product_category: 'Whey Protein',
    brand_name: 'MuscleBlaze',
    target_market: 'India',
    status: 'completed',
    current_agent: null,
    progress_pct: 100,
    error_message: null,
    celery_task_id: 'task-001',
    started_at: new Date(Date.now() - 3_600_000).toISOString(),
    completed_at: new Date(Date.now() - 3_000_000).toISOString(),
    created_at: new Date(Date.now() - 3_700_000).toISOString(),
  },
  {
    id: 'run-002',
    user_id: 'mock-user',
    product_category: 'Face Serum',
    brand_name: 'Minimalist',
    target_market: 'India',
    status: 'completed',
    current_agent: null,
    progress_pct: 100,
    error_message: null,
    celery_task_id: 'task-002',
    started_at: new Date(Date.now() - 86_400_000).toISOString(),
    completed_at: new Date(Date.now() - 85_800_000).toISOString(),
    created_at: new Date(Date.now() - 86_500_000).toISOString(),
  },
]

export interface RunRequest {
  product_category: string
  brand_name?: string
  target_market?: string
}

export interface RunResponse {
  run_id: string
  status: string
}

export interface OrderRequest {
  plan: string
}

export interface OrderResponse {
  order_id: string
  amount: number
  currency: string
}

// ── API Functions ───────────────────────────────────────────────

export async function startRun(payload: RunRequest): Promise<RunResponse> {
  await delay(800)
  const run_id = `run-${Date.now()}`
  // Push to mock store
  MOCK_RUNS.unshift({
    id: run_id,
    user_id: 'mock-user',
    product_category: payload.product_category,
    brand_name: payload.brand_name ?? null,
    target_market: payload.target_market ?? 'India',
    status: 'queued',
    current_agent: null,
    progress_pct: 0,
    error_message: null,
    celery_task_id: null,
    started_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
  })
  return { run_id, status: 'queued' }
}

export async function getReport(runId: string) {
  await delay(400)
  const run = MOCK_RUNS.find((r) => r.id === runId) ?? MOCK_RUNS[0]
  
  return {
    run,
    executiveSummary: "The competitive landscape for Whey Protein in India is highly saturated at the ₹1,500 - ₹2,000 price band, largely dominated by legacy brands with strong distribution. However, our sentiment mining across 10,000 recent reviews shows an emerging gap in 'clean label, minimal ingredient' profiles for Tier 1 city consumers. Positioning a product with natural sweeteners at a 15% premium (₹2,299) presents an immediate opportunity to capture high-LTV fitness enthusiasts.",
    insights: [
      { id: 1, title: 'Pricing Elasticity', desc: 'Consumers show low resistance to ₹200-300 premiums if isolate purity is verified by third-party certs.' },
      { id: 2, title: 'Flavor Fatigue', desc: 'Over 34% of negative reviews across competitors cite "artificial chocolate taste". Demand for unflavored or coffee variants is up 40% YoY.' },
      { id: 3, title: 'Supply Chain', desc: 'Raw material costs from local dairy co-ops have stabilized. Verified contract manufacturers are operating at 80% capacity, ready for RFQs.' }
    ],
    competitors: [
      { name: 'MuscleBlaze', price: 1899, rating: 4.2, positioning: 'Mass Market, Gym Chains' },
      { name: 'MyProtein', price: 2499, rating: 4.5, positioning: 'Premium, D2C Heavy' },
      { name: 'Optimum Nutrition', price: 2899, rating: 4.8, positioning: 'Global Standard, High Trust' }
    ],
    recommendations: [
      'Launch a coffee-flavored isolate geared towards morning usage.',
      'Use minimalistic pharmaceutical-grade packaging to stand out from bright, chaotic competitor tubs.',
      'Target digital ad spend on Reddit and specialty fitness forums rather than broad Instagram campaigns.'
    ]
  }
}

export async function listReports(): Promise<AgentRun[]> {
  await delay(300)
  return MOCK_RUNS
}

export async function createOrder(_payload: OrderRequest): Promise<OrderResponse> {
  await delay(600)
  return { order_id: 'order_mock_001', amount: 499900, currency: 'INR' }
}

export async function verifyPayment(_payload: Record<string, string>) {
  await delay(500)
  return { status: 'success' }
}
