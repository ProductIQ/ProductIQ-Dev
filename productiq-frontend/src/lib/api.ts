// src/lib/api.ts
// Real API layer — calls FastAPI backend via axios.
// The backend base URL is configured via VITE_API_URL (defaults to /api
// which works with the Vite dev proxy in vite.config.ts).

import axios from 'axios'
import { supabase } from '@/lib/supabase'
import type { AgentRun } from '@/types/agent'
import { addSentryBreadcrumb, captureException } from '@/lib/sentry'

// ── Axios instance ──────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 30_000,
})

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  // In E2E test mode, use a mock token (bypasses Supabase)
  if (import.meta.env.VITE_E2E_TEST === 'true') {
    config.headers.Authorization = 'Bearer mock-access-token-test'
    return config
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add Sentry breadcrumbs for API calls + capture errors
api.interceptors.response.use(
  (response) => {
    addSentryBreadcrumb('api', `${response.config.method?.toUpperCase()} ${response.config.url}`, 'info', {
      status: response.status,
    })
    return response
  },
  (error) => {
    const status = error.response?.status
    const url = error.config?.url
    addSentryBreadcrumb('api', `FAILED ${error.config?.method?.toUpperCase()} ${url}`, 'error', {
      status,
      message: error.message,
    })
    // Capture 500 errors in Sentry (4xx are expected client errors)
    if (status && status >= 500) {
      captureException(error, { url, status, method: error.config?.method })
    }
    return Promise.reject(error)
  }
)

// ── Types ───────────────────────────────────────────────────────
export interface RunRequest {
  product_category: string
  brand_name?: string
  target_market?: string
}

export interface RunResponse {
  run_id: string
  status: string
  celery_task_id: string | null
  mode: string
  message: string
}

export interface OrderRequest {
  plan: string
}

export interface OrderResponse {
  order_id: string
  amount: number
  currency: string
  key: string
}

export interface VerifyRequest {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
  plan: string
}

export interface VerifyResponse {
  status: string
  plan_activated: string
  message: string
}

// ── API Functions ───────────────────────────────────────────────

/** POST /reports/run — start a new analysis pipeline */
export async function startRun(payload: RunRequest): Promise<RunResponse> {
  const { data } = await api.post<RunResponse>('/reports/run', payload)
  return data
}

/** GET /reports/ — list all runs for the authenticated user */
export async function listReports(): Promise<AgentRun[]> {
  const { data } = await api.get<{ runs: AgentRun[]; total: number }>('/reports/')
  return data.runs
}

/** GET /reports/{run_id} — get run detail + agent outputs + report URLs */
export async function getRun(runId: string) {
  const { data } = await api.get<{
    run: AgentRun
    report: {
      id: string
      run_id: string
      title: string
      pdf_url: string | null
      pptx_url: string | null
      is_watermarked: boolean
      page_count: number | null
      created_at: string
    } | null
    agent_outputs: Array<{
      agent_name: string
      agent_number: number
      status: string
      output: Record<string, unknown> | null
      duration_seconds: number | null
      started_at: string | null
      completed_at: string | null
    }>
  }>(`/reports/${runId}`)
  return data
}

/** GET /reports/{run_id}/insights */
export async function getInsights(runId: string) {
  const { data } = await api.get<{ insights: unknown[]; total: number }>(`/reports/${runId}/insights`)
  return data.insights
}

/** GET /reports/{run_id}/concepts */
export async function getConcepts(runId: string) {
  const { data } = await api.get<{ concepts: unknown[]; total: number }>(`/reports/${runId}/concepts`)
  return data.concepts
}

/** GET /reports/{run_id}/gtm */
export async function getGtm(runId: string) {
  const { data } = await api.get<{ gtm_plans: unknown[] }>(`/reports/${runId}/gtm`)
  return data.gtm_plans
}

/** GET /reports/{run_id}/clusters */
export async function getClusters(runId: string) {
  const { data } = await api.get<{ clusters: unknown[]; total: number }>(`/reports/${runId}/clusters`)
  return data.clusters
}

/** GET /reports/{run_id}/competitors */
export async function getCompetitors(runId: string) {
  const { data } = await api.get<{ competitors: unknown[]; total: number }>(`/reports/${runId}/competitors`)
  return data.competitors
}

/** GET /reports/{run_id}/products */
export async function getProducts(runId: string) {
  const { data } = await api.get<{ products: unknown[]; total: number }>(`/reports/${runId}/products`)
  return data.products
}

/** DELETE /reports/{run_id} */
export async function deleteRun(runId: string) {
  const { data } = await api.delete<{ deleted: boolean; run_id: string }>(`/reports/${runId}`)
  return data
}

// ── Profile ─────────────────────────────────────────────────────

export async function getProfile() {
  const { data } = await api.get('/profile/')
  return data
}

export async function updateProfile(payload: { full_name?: string; company_name?: string; slack_webhook_url?: string }) {
  const { data } = await api.patch('/profile/', payload)
  return data
}

// ── Payments ────────────────────────────────────────────────────

export async function createOrder(payload: OrderRequest): Promise<OrderResponse> {
  const { data } = await api.post<OrderResponse>('/payments/order', payload)
  return data
}

export async function verifyPayment(payload: VerifyRequest): Promise<VerifyResponse> {
  const { data } = await api.post<VerifyResponse>('/payments/verify', payload)
  return data
}

export async function getPaymentHistory() {
  const { data } = await api.get('/payments/history')
  return data
}

// ── Sentiment ───────────────────────────────────────────────────

export async function getSentimentHistory(brand?: string) {
  const params = brand ? { brand } : undefined
  const { data } = await api.get('/sentiment/', { params })
  return data
}

// ── Knowledge Graph ─────────────────────────────────────────────

export async function getKnowledgeGraph(runId: string) {
  const { data } = await api.get(`/graph/${runId}`)
  return data
}

// ── SSE stream URL builder ──────────────────────────────────────
// EventSource can't set Authorization headers, so we pass the token
// as a query param. The backend supports ?token=<jwt> on the SSE endpoint.
export async function buildSseUrl(runId: string): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const base = import.meta.env.VITE_API_URL ?? '/api'
  const url = `${base}/stream/${runId}`
  return token ? `${url}?token=${encodeURIComponent(token)}` : url
}

// ── V2: Notifications ───────────────────────────────────────────

export async function getNotifications(unreadOnly = false) {
  const { data } = await api.get('/v2/notifications', { params: { unread_only: unreadOnly } })
  return data
}

export async function markNotificationRead(notificationId: string) {
  const { data } = await api.patch(`/v2/notifications/${notificationId}/read`)
  return data
}

export async function markAllNotificationsRead() {
  const { data } = await api.patch('/v2/notifications/read-all')
  return data
}

export async function getUnreadCount() {
  const { data } = await api.get('/v2/notifications/unread-count')
  return data.count as number
}

// ── V2: Intelligence Events ─────────────────────────────────────

export async function getIntelligenceEvents(brand?: string, severity?: string) {
  const params: Record<string, string> = {}
  if (brand) params.brand = brand
  if (severity) params.severity = severity
  const { data } = await api.get('/v2/intelligence/events', { params })
  return data.events
}

export async function getIntelligenceBrands() {
  const { data } = await api.get('/v2/intelligence/brands')
  return data.brands
}

// ── V2: Brand Profiles ──────────────────────────────────────────

export async function getBrands() {
  const { data } = await api.get('/v2/brands')
  return data.brands
}

export async function createBrand(payload: { brand_name: string; category: string; target_market?: string }) {
  const { data } = await api.post('/v2/brands', payload)
  return data.brand
}

export async function deleteBrand(brandId: string) {
  await api.delete(`/v2/brands/${brandId}`)
}

// ── V2: Chat ────────────────────────────────────────────────────

export async function getChatSessions() {
  const { data } = await api.get('/v2/chat/sessions')
  return data.sessions
}

export async function getChatMessages(sessionId: string) {
  const { data } = await api.get(`/v2/chat/sessions/${sessionId}/messages`)
  return data.messages
}

export async function sendChatMessage(payload: { message: string; run_id?: string; session_id?: string }) {
  const { data } = await api.post('/v2/chat/message', payload)
  return data
}

export async function deleteChatSession(sessionId: string) {
  await api.delete(`/v2/chat/sessions/${sessionId}`)
}

// ── V2: Compare ─────────────────────────────────────────────────

export async function compareRuns(runId1: string, runId2: string) {
  const { data } = await api.get(`/v2/compare/${runId1}/${runId2}`)
  return data
}

// ── V2: Validate ────────────────────────────────────────────────

export async function validateConcept(payload: {
  concept_name: string
  description: string
  target_market?: string
  run_id?: string
}) {
  const { data } = await api.post('/v2/validate', payload)
  return data
}

export async function getValidationHistory() {
  const { data } = await api.get('/v2/validate/history')
  return data.validations
}

// ── Admin: Stats ─────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const { data } = await api.get('/admin/stats')
  return data
}

// ── Admin: User Management ───────────────────────────────────────────────────

export async function getAdminUsers(params?: { limit?: number; offset?: number; search?: string; plan?: string }) {
  const { data } = await api.get('/admin/users', { params })
  return data as { users: AdminUser[]; total: number; offset: number; limit: number }
}

export async function changeUserPlan(userId: string, newPlan: string) {
  const { data } = await api.patch(`/admin/users/${userId}/plan`, null, { params: { new_plan: newPlan } })
  return data
}

export async function changeUserRole(userId: string, newRole: string) {
  const { data } = await api.patch(`/admin/users/${userId}/role`, null, { params: { new_role: newRole } })
  return data
}

// ── Admin: System Health ─────────────────────────────────────────────────────

export async function getAdminHealth() {
  const { data } = await api.get('/admin/health')
  return data as AdminHealth
}

// ── Admin: Revenue Analytics ─────────────────────────────────────────────────

export async function getAdminRevenue(days = 30) {
  const { data } = await api.get('/admin/revenue', { params: { days } })
  return data as AdminRevenue
}

// ── Admin: Run Analytics ─────────────────────────────────────────────────────

export async function getAdminRuns(days = 30) {
  const { data } = await api.get('/admin/runs', { params: { days } })
  return data as AdminRunAnalytics
}

// ── Admin: Audit Log ─────────────────────────────────────────────────────────

export async function getAdminAuditLog(params?: { limit?: number; offset?: number }) {
  const { data } = await api.get('/admin/audit-log', { params })
  return data as { entries: AdminAuditEntry[]; total: number; offset: number; limit: number }
}

// ── Admin Types ──────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  plan: string
  role: string
  reports_used_this_month: number
  reports_limit: number
  created_at: string
  updated_at: string
}

export interface AdminHealth {
  redis: { status: string; latency_ms?: number; error?: string }
  celery: { status: string; queues: Record<string, number> }
  llm: { status: string; keys_available: number }
  database: { status: string; error?: string }
}

export interface AdminRevenue {
  daily: { date: string; revenue_paise: number; count: number }[]
  plan_revenue_paise: Record<string, number>
  total_revenue_paise: number
  total_transactions: number
  avg_transaction_paise: number
}

export interface AdminRunAnalytics {
  daily: { date: string; total: number; completed: number; failed: number }[]
  categories: [string, number][]
  total: number
  completed: number
  failed: number
  success_rate: number
}

export interface AdminAuditEntry {
  id: string
  admin_id: string
  action: string
  target_id: string | null
  target_type: string
  details: Record<string, unknown>
  created_at: string
}
