// src/pages/AdminPage.tsx
// Admin dashboard — platform overview, user management, system health, revenue.
// Accessible only to users with role='admin'.
// Design: matches the rest of the app — white cards, dark accent strips,
// #A3A3A3 labels, border-[rgba(0,0,0,0.07)], no emojis.

import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Activity, DollarSign, Server, Shield, Search,
  TrendingUp, TrendingDown, CheckCircle, XCircle, Clock,
  Loader2, ChevronRight, Cpu, Database, Zap,
} from 'lucide-react'
import {
  getAdminStats, getAdminUsers, getAdminHealth,
  getAdminRevenue, getAdminRuns, getAdminAuditLog,
  changeUserPlan, changeUserRole,
  type AdminUser, type AdminHealth,
} from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100)
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sublabel, icon: Icon, trend,
}: {
  label: string
  value: string | number
  sublabel?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">{label}</span>
        <Icon size={14} className="text-[#A3A3A3]" />
      </div>
      <div className="text-[28px] font-bold tracking-tight text-[#0A0A0A] leading-none">{value}</div>
      {sublabel && (
        <div className="flex items-center gap-1 mt-2">
          {trend === 'up' && <TrendingUp size={11} className="text-[#10B981]" />}
          {trend === 'down' && <TrendingDown size={11} className="text-[#EF4444]" />}
          <span className="text-[11px] text-[#6B6B6B]">{sublabel}</span>
        </div>
      )}
    </motion.div>
  )
}

// ── Health Badge ──────────────────────────────────────────────────────────────
function HealthBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy:   '#10B981',
    degraded:  '#F59E0B',
    unhealthy: '#EF4444',
    unknown:   '#A3A3A3',
  }
  const color = colors[status] || colors.unknown
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold capitalize">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {status}
    </span>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  })
  const { data: revenue } = useQuery({
    queryKey: ['admin-revenue', 30],
    queryFn: () => getAdminRevenue(30),
  })
  const { data: runs } = useQuery({
    queryKey: ['admin-runs', 30],
    queryFn: () => getAdminRuns(30),
  })

  if (isLoading || !stats) {
    return <div className="py-20 text-center"><Loader2 size={20} className="animate-spin text-[#A3A3A3] mx-auto" /></div>
  }

  return (
    <div className="space-y-6">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats.users.total}
          sublabel={`+${stats.users.new_7d} this week`}
          icon={Users}
          trend="up"
        />
        <StatCard
          label="Total Runs"
          value={stats.runs.total}
          sublabel={`${stats.runs.completed} completed · ${stats.runs.failed} failed`}
          icon={Activity}
        />
        <StatCard
          label="Revenue (Total)"
          value={formatINR(stats.revenue.total_paise)}
          sublabel={`${formatINR(stats.revenue.revenue_7d_paise)} this week`}
          icon={DollarSign}
          trend="up"
        />
        <StatCard
          label="Intel Events"
          value={stats.intelligence.total_events}
          sublabel={`${stats.intelligence.critical_events} critical`}
          icon={Zap}
        />
      </div>

      {/* ── Plan distribution ── */}
      <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-4">Plan Distribution</p>
        <div className="flex items-end gap-6 h-32">
          {(['free', 'pro', 'enterprise'] as const).map(plan => {
            const count = stats.users.by_plan[plan] || 0
            const pct = stats.users.total > 0 ? (count / stats.users.total) * 100 : 0
            const heights = { free: 'bg-[#A3A3A3]', pro: 'bg-[#0A0A0A]', enterprise: 'bg-[#C8F04A]' }
            return (
              <div key={plan} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-[18px] font-bold text-[#0A0A0A]">{count}</div>
                <div className="w-full flex items-end h-20">
                  <div
                    className={`w-full rounded-t-md ${heights[plan]}`}
                    style={{ height: `${Math.max(pct, 4)}%`, transition: 'height 0.4s ease' }}
                  />
                </div>
                <span className="text-[11px] font-medium text-[#6B6B6B] capitalize">{plan}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Revenue + Runs side by side ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue chart */}
        <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-4">Revenue (30 days)</p>
          {revenue && revenue.daily.length > 0 ? (
            <RevenueChart data={revenue.daily} />
          ) : (
            <p className="text-[12px] text-[#A3A3A3] py-8 text-center">No revenue data yet</p>
          )}
          {revenue && (
            <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.05)] flex justify-between text-[12px]">
              <span className="text-[#6B6B6B]">Total: <strong className="text-[#0A0A0A]">{formatINR(revenue.total_revenue_paise)}</strong></span>
              <span className="text-[#6B6B6B]">Transactions: <strong className="text-[#0A0A0A]">{revenue.total_transactions}</strong></span>
            </div>
          )}
        </div>

        {/* Runs chart */}
        <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-4">Runs (30 days)</p>
          {runs && runs.daily.length > 0 ? (
            <RunsChart data={runs.daily} />
          ) : (
            <p className="text-[12px] text-[#A3A3A3] py-8 text-center">No run data yet</p>
          )}
          {runs && (
            <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.05)] flex justify-between text-[12px]">
              <span className="text-[#6B6B6B]">Success rate: <strong className="text-[#0A0A0A]">{runs.success_rate}%</strong></span>
              <span className="text-[#6B6B6B]">Total: <strong className="text-[#0A0A0A]">{runs.total}</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Revenue Chart (simple bar chart) ──────────────────────────────────────────
function RevenueChart({ data }: { data: { date: string; revenue_paise: number; count: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.revenue_paise), 1)
  return (
    <div className="flex items-end gap-1 h-32">
      {data.slice(-30).map((d, i) => (
        <div key={i} className="flex-1 flex items-end h-full" title={`${d.date}: ${formatINR(d.revenue_paise)}`}>
          <div
            className="w-full rounded-t-sm bg-[#0A0A0A]"
            style={{ height: `${(d.revenue_paise / maxVal) * 100}%`, minHeight: d.revenue_paise > 0 ? '2px' : '0' }}
          />
        </div>
      ))}
    </div>
  )
}

// ── Runs Chart (stacked bar) ──────────────────────────────────────────────────
function RunsChart({ data }: { data: { date: string; total: number; completed: number; failed: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.total), 1)
  return (
    <div className="flex items-end gap-1 h-32">
      {data.slice(-30).map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-end h-full" title={`${d.date}: ${d.total} runs`}>
          <div
            className="w-full rounded-t-sm bg-[#10B981]"
            style={{ height: `${(d.completed / maxVal) * 100}%`, minHeight: d.completed > 0 ? '2px' : '0' }}
          />
          <div
            className="w-full bg-[#EF4444]"
            style={{ height: `${(d.failed / maxVal) * 100}%`, minHeight: d.failed > 0 ? '2px' : '0' }}
          />
        </div>
      ))}
    </div>
  )
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [page, setPage] = useState(0)
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, planFilter, page],
    queryFn: () => getAdminUsers({ limit, offset: page * limit, search: search || undefined, plan: planFilter }),
  })

  const planMutation = useMutation({
    mutationFn: ({ userId, plan }: { userId: string; plan: string }) => changeUserPlan(userId, plan),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => changeUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const users: AdminUser[] = data?.users ?? []
  const total = data?.total ?? 0

  return (
    <div className="space-y-4">
      {/* ── Search + filter bar ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search by email, name, company..."
            className="w-full pl-8 pr-3 py-2 bg-white border border-[rgba(0,0,0,0.07)] rounded-full text-[12px] focus:outline-none focus:border-[#0A0A0A]"
          />
        </div>
        <select
          value={planFilter}
          onChange={e => { setPlanFilter(e.target.value); setPage(0) }}
          className="px-3 py-2 bg-white border border-[rgba(0,0,0,0.07)] rounded-full text-[12px] focus:outline-none focus:border-[#0A0A0A]"
        >
          <option value="all">All plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* ── Users table ── */}
      <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden">
        {isLoading ? (
          <div className="py-14 text-center"><Loader2 size={18} className="animate-spin text-[#A3A3A3] mx-auto" /></div>
        ) : users.length === 0 ? (
          <div className="py-14 text-center">
            <Users size={20} className="text-[#C8C8C8] mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-[#0A0A0A]">No users found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.05)]">
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] px-5 py-3">User</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] px-3 py-3">Plan</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] px-3 py-3">Usage</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] px-3 py-3">Role</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] px-3 py-3">Joined</th>
                <th className="text-right text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-[rgba(0,0,0,0.04)] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-3">
                    <div className="text-[12px] font-semibold text-[#0A0A0A]">{u.full_name || u.email}</div>
                    <div className="text-[10px] text-[#A3A3A3]">{u.email}</div>
                    {u.company_name && <div className="text-[10px] text-[#A3A3A3]">{u.company_name}</div>}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={u.plan}
                      onChange={e => planMutation.mutate({ userId: u.id, plan: e.target.value })}
                      className="text-[11px] font-medium bg-transparent border border-[rgba(0,0,0,0.08)] rounded-lg px-2 py-1 focus:outline-none focus:border-[#0A0A0A] capitalize"
                    >
                      <option value="free">free</option>
                      <option value="pro">pro</option>
                      <option value="enterprise">enterprise</option>
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[11px] text-[#6B6B6B]">{u.reports_used_this_month}/{u.reports_limit}</span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => roleMutation.mutate({ userId: u.id, role: u.role === 'admin' ? 'user' : 'admin' })}
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-colors"
                      style={{
                        background: u.role === 'admin' ? '#0A0A0A' : 'transparent',
                        color: u.role === 'admin' ? '#C8F04A' : '#6B6B6B',
                        border: u.role === 'admin' ? 'none' : '1px solid rgba(0,0,0,0.08)',
                      }}
                    >
                      {u.role === 'admin' ? 'Admin' : 'User'}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[11px] text-[#A3A3A3]">{formatDate(u.created_at)}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <ChevronRight size={14} className="text-[#C8C8C8] inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Pagination ── */}
        {total > limit && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(0,0,0,0.05)]">
            <span className="text-[11px] text-[#A3A3A3]">
              {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-[11px] font-medium px-3 py-1 rounded-lg border border-[rgba(0,0,0,0.08)] disabled:opacity-40 hover:bg-[#FAFAFA]"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= total}
                className="text-[11px] font-medium px-3 py-1 rounded-lg border border-[rgba(0,0,0,0.08)] disabled:opacity-40 hover:bg-[#FAFAFA]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Health Tab ────────────────────────────────────────────────────────────────
function HealthTab() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['admin-health'],
    queryFn: getAdminHealth,
    refetchInterval: 15_000, // refresh every 15s
  })

  if (isLoading || !health) {
    return <div className="py-20 text-center"><Loader2 size={20} className="animate-spin text-[#A3A3A3] mx-auto" /></div>
  }

  const h = health as AdminHealth

  return (
    <div className="space-y-4">
      {/* ── Service cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ServiceCard label="Database" icon={Database} status={h.database.status} sublabel={h.database.error ? 'Connection error' : 'Responsive'} />
        <ServiceCard label="Redis Cache" icon={Server} status={h.redis.status} sublabel={h.redis.latency_ms ? `${h.redis.latency_ms}ms` : h.redis.error || '—'} />
        <ServiceCard label="Celery Queue" icon={Activity} status={h.celery.status} sublabel={`${Object.values(h.celery.queues).reduce((a, b) => a + b, 0)} tasks queued`} />
        <ServiceCard label="LLM API" icon={Cpu} status={h.llm.status} sublabel={`${h.llm.keys_available} keys available`} />
      </div>

      {/* ── Queue breakdown ── */}
      <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-4">Celery Queue Breakdown</p>
        <div className="space-y-3">
          {Object.entries(h.celery.queues).map(([name, depth]) => (
            <div key={name} className="flex items-center gap-4">
              <span className="text-[12px] font-medium text-[#0A0A0A] w-24 capitalize">{name}</span>
              <div className="flex-1 h-6 bg-[#F4F4F5] rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md transition-all"
                  style={{
                    width: `${Math.min((depth / 50) * 100, 100)}%`,
                    background: depth > 20 ? '#EF4444' : depth > 5 ? '#F59E0B' : '#0A0A0A',
                  }}
                />
              </div>
              <span className="text-[12px] font-bold text-[#0A0A0A] w-8 text-right">{depth}</span>
            </div>
          ))}
          {Object.keys(h.celery.queues).length === 0 && (
            <p className="text-[12px] text-[#A3A3A3] py-4 text-center">No queue data available</p>
          )}
        </div>
      </div>

      {/* ── Detailed status ── */}
      <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-4">Service Details</p>
        <div className="space-y-2">
          <DetailRow label="Redis Latency" value={h.redis.latency_ms ? `${h.redis.latency_ms} ms` : 'N/A'} />
          <DetailRow label="Redis Error" value={h.redis.error || 'None'} />
          <DetailRow label="LLM Keys" value={`${h.llm.keys_available} available`} />
          <DetailRow label="Database Error" value={h.database.error || 'None'} />
        </div>
      </div>
    </div>
  )
}

function ServiceCard({
  label, icon: Icon, status, sublabel,
}: {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  status: string
  sublabel: string
}) {
  return (
    <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">{label}</span>
        <Icon size={14} className="text-[#A3A3A3]" />
      </div>
      <HealthBadge status={status} />
      <p className="text-[11px] text-[#6B6B6B] mt-2">{sublabel}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.04)] last:border-0">
      <span className="text-[11px] text-[#A3A3A3]">{label}</span>
      <span className="text-[11px] font-medium text-[#0A0A0A]">{value}</span>
    </div>
  )
}

// ── Audit Log Tab ─────────────────────────────────────────────────────────────
function AuditTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: () => getAdminAuditLog({ limit: 50 }),
  })

  const entries = data?.entries ?? []

  return (
    <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden">
      {isLoading ? (
        <div className="py-14 text-center"><Loader2 size={18} className="animate-spin text-[#A3A3A3] mx-auto" /></div>
      ) : entries.length === 0 ? (
        <div className="py-14 text-center">
          <Shield size={20} className="text-[#C8C8C8] mx-auto mb-2" />
          <p className="text-[13px] font-semibold text-[#0A0A0A]">No audit entries yet</p>
          <p className="text-[12px] text-[#A3A3A3]">Admin actions will be logged here.</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(0,0,0,0.05)]">
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] px-5 py-3">Action</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] px-3 py-3">Target</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] px-3 py-3">Details</th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] px-5 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} className="border-b border-[rgba(0,0,0,0.04)] last:border-0">
                <td className="px-5 py-3">
                  <span className="text-[11px] font-mono font-semibold text-[#0A0A0A]">{e.action}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-[11px] text-[#6B6B6B]">{e.target_id ? e.target_id.substring(0, 8) + '…' : '—'}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-[11px] text-[#6B6B6B]">{JSON.stringify(e.details)}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-[11px] text-[#A3A3A3]">{timeAgo(e.created_at)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Main AdminPage ────────────────────────────────────────────────────────────
type AdminTab = 'overview' | 'users' | 'health' | 'audit'

export function AdminPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<AdminTab>('overview')

  const isAdmin = profile?.role === 'admin'

  const tabs: { key: AdminTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { key: 'overview', label: 'Overview',    icon: Activity },
    { key: 'users',    label: 'Users',       icon: Users },
    { key: 'health',   label: 'System Health', icon: Server },
    { key: 'audit',    label: 'Audit Log',   icon: Shield },
  ]

  // ── Access denied for non-admins ──
  if (!isAdmin) {
    return (
      <div className="max-w-[860px] mx-auto pb-12">
        <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-12 text-center">
          <Shield size={32} className="text-[#C8C8C8] mx-auto mb-4" />
          <h1 className="text-[20px] font-bold text-[#0A0A0A] mb-2">Admin Access Required</h1>
          <p className="text-[13px] text-[#A3A3A3]">
            You need admin privileges to view this page. Contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1100px] mx-auto pb-12">
      {/* ── Header ── */}
      <div className="mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#A3A3A3] mb-1 flex items-center gap-1.5">
            <Shield size={10} className="text-[#0A0A0A]" /> Admin Panel
          </p>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">Platform Dashboard</h1>
          <p className="text-[13px] text-[#A3A3A3] mt-1">Manage users, monitor system health, and track revenue.</p>
        </motion.div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-0.5 mb-6 bg-white rounded-[14px] p-1 border border-[rgba(0,0,0,0.07)] w-fit">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3.5 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all flex items-center gap-1.5"
              style={{
                background: tab === t.key ? '#0F0F0F' : 'transparent',
                color:      tab === t.key ? '#fff'     : '#6B6B6B',
              }}
            >
              <Icon size={12} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      {tab === 'overview' && <OverviewTab />}
      {tab === 'users'    && <UsersTab />}
      {tab === 'health'   && <HealthTab />}
      {tab === 'audit'    && <AuditTab />}
    </div>
  )
}
