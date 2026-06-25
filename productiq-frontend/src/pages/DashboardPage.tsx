// src/pages/DashboardPage.tsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, Copy, Check, Plus,
  TrendingUp, TrendingDown, BarChart3, Brain,
  FileText, Zap, Activity, ChevronRight,
  ShieldCheck, Globe2, Sparkles, ArrowLeftRight,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useRuns } from '@/hooks/useRuns'
import { useCountUp } from '@/hooks/useCountUp'
import { getGreeting, formatRelativeTime } from '@/lib/utils'
import { useRealtimeSentiment } from '@/hooks/useRealtimeSentiment'
import { getInsights } from '@/lib/api'
import type { AgentRun } from '@/types/agent'
import type { Insight } from '@/types/report'

// ── Micro Sparkline ────────────────────────────────────────────────────────────
function Sparkline({
  data, color = '#C8F04A', height = 28,
}: { data: number[]; color?: string; height?: number }) {
  const max  = Math.max(...data)
  const min  = Math.min(...data)
  const rng  = max - min || 1
  const w    = 64
  const step = w / (data.length - 1)
  const pts  = data.map((v, i) => [i * step, height - ((v - min) / rng) * (height - 4) - 2])
  const d    = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
interface StatCardProps {
  value: number | string
  label: string
  sub?: string
  delta?: number
  sparkData?: number[]
  accent?: boolean
}

function StatCard({ value, label, sub, delta, sparkData, accent }: StatCardProps) {
  const numVal  = typeof value === 'number' ? value : null
  const count   = useCountUp(numVal ?? 0, 1000)
  const display = numVal !== null ? count : value
  const isUp    = delta !== undefined ? delta > 0 : null

  return (
    <div
      className={`rounded-[20px] p-6 border transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] ${
        accent
          ? 'bg-[#0F0F0F] border-[rgba(255,255,255,0.07)] text-white'
          : 'bg-white border-[rgba(0,0,0,0.07)]'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className={`text-[32px] font-bold tracking-tight leading-none mb-1.5 ${accent ? 'text-[#C8F04A]' : 'text-[#0A0A0A]'}`}>
            {display}
          </div>
          <div className={`text-[13px] font-semibold mb-0.5 ${accent ? 'text-white/80' : 'text-[#0A0A0A]'}`}>{label}</div>
          {sub && <div className={`text-[11px] ${accent ? 'text-white/30' : 'text-[#A3A3A3]'}`}>{sub}</div>}
        </div>
        {sparkData && (
          <Sparkline data={sparkData} color={accent ? '#C8F04A' : '#0A0A0A'} />
        )}
      </div>
      {delta !== undefined && (
        <div className={`flex items-center gap-1 text-[11px] font-semibold ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
          {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {isUp ? '+' : ''}{delta}% vs last month
        </div>
      )}
    </div>
  )
}

// ── Run Row ───────────────────────────────────────────────────────────────────
function RunRow({ run }: { run: AgentRun }) {
  const navigate   = useNavigate()
  const isRunning  = run.status === 'running' || run.status === 'queued'
  const isComplete = run.status === 'completed'

  const STATUS_CFG = {
    completed: { dot: '#22C55E', text: 'Completed', bg: '#dcfce7', textColor: '#16A34A' },
    running:   { dot: '#C8F04A', text: 'Running',   bg: '#f7fee7', textColor: '#4d7c0f' },
    queued:    { dot: '#F59E0B', text: 'Queued',    bg: '#FEF3C7', textColor: '#B45309' },
    failed:    { dot: '#EF4444', text: 'Failed',    bg: '#fee2e2', textColor: '#EF4444' },
  }
  const cfg = STATUS_CFG[run.status] ?? STATUS_CFG.queued

  return (
    <motion.button
      whileHover={{ x: 2 }}
      onClick={() => navigate(isComplete ? `/reports/${run.id}` : `/reports/${run.id}/status`)}
      className="w-full flex items-center gap-4 py-4 text-left group border-b border-[rgba(0,0,0,0.05)] last:border-0"
    >
      <div className="w-9 h-9 rounded-[12px] bg-[#F8F9FB] border border-[rgba(0,0,0,0.06)] flex items-center justify-center flex-shrink-0">
        <FileText size={14} className="text-[#A3A3A3]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[#0A0A0A] truncate">
          {run.product_category}
          {run.brand_name && <span className="text-[#A3A3A3] font-normal ml-2">· {run.brand_name}</span>}
        </div>
        <div className="text-[11px] text-[#A3A3A3] mt-0.5">{formatRelativeTime(run.created_at)}</div>
      </div>

      {isRunning && (
        <div className="flex items-center gap-2 w-24 flex-shrink-0">
          <div className="flex-1 h-0.5 rounded-full overflow-hidden bg-[#F0F2F5]">
            <div className="h-full rounded-full bg-[#C8F04A]" style={{ width: `${run.progress_pct}%` }} />
          </div>
          <span className="text-[10px] font-mono text-[#A3A3A3]">{run.progress_pct}%</span>
        </div>
      )}

      <span
        className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0"
        style={{ background: cfg.bg, color: cfg.textColor }}
      >
        {cfg.text}
      </span>
      <ArrowRight size={12} className="text-[#D1D5DB] group-hover:text-[#0A0A0A] transition-colors flex-shrink-0" />
    </motion.button>
  )
}

// ── Insight type config ───────────────────────────────────────────────────────
const INSIGHT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  market_gap:            { label: 'Market Gap',       color: '#0F0F0F' },
  consumer_need:         { label: 'Consumer Need',    color: '#22C55E' },
  competitive_advantage: { label: 'Competitive Edge', color: '#0EA5E9' },
  trend_opportunity:     { label: 'Trend Signal',     color: '#F59E0B' },
  risk:                  { label: 'Risk Flag',        color: '#EF4444' },
}

// Maps a run status to an activity-feed tag/color.
const RUN_STATUS_TAG: Record<AgentRun['status'], { tag: string; tagColor: string }> = {
  completed: { tag: 'REPORT',  tagColor: '#A3A3A3' },
  running:   { tag: 'RUNNING', tagColor: '#C8F04A' },
  queued:    { tag: 'QUEUED',  tagColor: '#F59E0B' },
  failed:    { tag: 'ALERT',   tagColor: '#EF4444' },
}

// ── Brand Health ──────────────────────────────────────────────────────────────
function BrandHealthCard() {
  const navigate = useNavigate()
  const { latestScore } = useRealtimeSentiment()
  const score  = latestScore?.score ?? 0.54
  const color  = score > 0.5 ? '#22C55E' : score > 0.1 ? '#F59E0B' : '#EF4444'
  const label  = score > 0.5 ? 'Healthy' : score > 0.1 ? 'Neutral' : 'Needs attention'
  const trend  = [0.42, 0.48, 0.51, 0.49, 0.55, 0.53, parseFloat(score.toFixed(2))]

  return (
    <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-[#A3A3A3]" />
          <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-wider">Brand Health</h3>
        </div>
        <button
          onClick={() => navigate('/sentiment')}
          className="text-[11px] text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors flex items-center gap-0.5"
        >
          Details <ChevronRight size={10} />
        </button>
      </div>

      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className="text-[30px] font-black tracking-tight leading-none" style={{ color }}>
            {score >= 0 ? '+' : ''}{score.toFixed(2)}
          </div>
          <div className="text-[12px] font-semibold mt-1" style={{ color }}>{label}</div>
          <div className="text-[11px] text-[#A3A3A3] mt-0.5">+0.08 vs 7-day avg</div>
        </div>
        <Sparkline data={trend} color={color} height={38} />
      </div>

      <div className="flex gap-2 pt-4 border-t border-[rgba(0,0,0,0.05)]">
        {[
          { name: 'Amazon', score: 0.62 },
          { name: 'Reddit', score: 0.44 },
          { name: 'X',      score: 0.55 },
        ].map(p => {
          const c = p.score > 0.5 ? '#22C55E' : '#F59E0B'
          return (
            <div key={p.name} className="flex-1 text-center">
              <div className="text-[11px] font-mono font-bold" style={{ color: c }}>
                {p.score >= 0 ? '+' : ''}{p.score.toFixed(2)}
              </div>
              <div className="text-[9px] font-medium text-[#A3A3A3] mt-0.5 uppercase tracking-wider">{p.name}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Active Agents Widget ───────────────────────────────────────────────────────
// Shows real-time agent activity with pulsing status
function ActiveAgentsCard() {
  const navigate = useNavigate()
  const AGENTS = [
    { name: 'Brand Mention Tracker', status: 'running', next: '2h' },
    { name: 'Trend Velocity Monitor', status: 'running', next: '45m' },
    { name: 'Price Optimizer',        status: 'idle',    next: '8am IST' },
    { name: 'Sentiment Tracker',      status: 'idle',    next: '7am IST' },
    { name: 'Competitor Launch Scout', status: 'idle',   next: '6h' },
  ]
  const running = AGENTS.filter(a => a.status === 'running').length

  return (
    <div className="bg-white rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.07)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2">
          <Brain size={13} className="text-[#A3A3A3]" />
          <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-wider">Agents</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C8F04A] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#0A0A0A]">{running} active</span>
        </div>
      </div>
      <div className="divide-y divide-[rgba(0,0,0,0.04)]">
        {AGENTS.map(a => (
          <div key={a.name} className="flex items-center justify-between px-6 py-3.5 group hover:bg-[#FAFAFA] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: a.status === 'running' ? '#22C55E' : '#D1D5DB',
                  animation: a.status === 'running' ? 'pulse 2s infinite' : 'none',
                }}
              />
              <span className="text-[12px] text-[#0A0A0A] truncate">{a.name}</span>
            </div>
            <span className="text-[10px] font-mono text-[#A3A3A3] flex-shrink-0 ml-3">{a.next}</span>
          </div>
        ))}
      </div>
      <div className="px-6 py-3.5 border-t border-[rgba(0,0,0,0.05)]" style={{ background: '#FAFAFA' }}>
        <button className="text-[11px] font-semibold text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors flex items-center gap-1">
          View all 20 agents <ChevronRight size={10} />
        </button>
      </div>
    </div>
  )
}

// ── Market Snapshot Widget ─────────────────────────────────────────────────────
// Top trends + price movements
function MarketSnapshotCard() {
  const navigate = useNavigate()
  const TRENDS = [
    { name: 'Plant-based protein india', velocity: '+304%', dir: 'up' },
    { name: 'Whey protein sugar free',   velocity: '+209%', dir: 'up' },
    { name: 'Mass gainer india',         velocity: '−22%',  dir: 'down' },
  ]
  const PRICES = [
    { brand: 'MuscleBlaze 2kg', change: '−7.4%', dir: 'down' },
    { brand: 'ON Gold Standard', change: '+6.7%', dir: 'up' },
    { brand: 'Nakpro 1kg',      change: 'NEW',    dir: 'new' },
  ]

  return (
    <div className="bg-white rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.07)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2">
          <Globe2 size={13} className="text-[#A3A3A3]" />
          <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-wider">Market Snapshot</h3>
        </div>
        <button
          onClick={() => navigate('/intelligence')}
          className="text-[11px] text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors flex items-center gap-0.5"
        >
          Intel feed <ChevronRight size={10} />
        </button>
      </div>

      {/* Trends */}
      <div className="px-6 pt-4 pb-3">
        <p className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-3">Trend velocity</p>
        <div className="space-y-2.5">
          {TRENDS.map(t => (
            <div key={t.name} className="flex items-center justify-between gap-3">
              <span className="text-[12px] text-[#0A0A0A] truncate">{t.name}</span>
              <span
                className="text-[11px] font-mono font-bold flex-shrink-0"
                style={{ color: t.dir === 'up' ? '#22C55E' : '#EF4444' }}
              >
                {t.velocity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Price moves */}
      <div className="px-6 pt-3 pb-4 border-t border-[rgba(0,0,0,0.05)]">
        <p className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-3">Price moves</p>
        <div className="space-y-2.5">
          {PRICES.map(p => (
            <div key={p.brand} className="flex items-center justify-between gap-3">
              <span className="text-[12px] text-[#0A0A0A] truncate">{p.brand}</span>
              <span
                className="text-[11px] font-mono font-bold flex-shrink-0"
                style={{
                  color: p.dir === 'up' ? '#22C55E'
                       : p.dir === 'down' ? '#EF4444'
                       : '#A3A3A3',
                }}
              >
                {p.change}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Concept Pipeline Widget ────────────────────────────────────────────────────
// Shows product concepts generated and their validation scores
function ConceptPipelineCard() {
  const navigate = useNavigate()
  const CONCEPTS = [
    { name: 'AshwaWhey Pro',       category: 'Whey Protein',   score: 87, status: 'validated' },
    { name: 'Sugar-Free Collagen', category: 'Protein Bar',    score: 74, status: 'pending' },
    { name: 'Plant Adaptogen Mix', category: 'Plant Protein',  score: 0,  status: 'draft' },
  ]

  return (
    <div className="bg-white rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.07)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-[#A3A3A3]" />
          <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-wider">Concept Pipeline</h3>
        </div>
        <button
          onClick={() => navigate('/validate')}
          className="text-[11px] text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors flex items-center gap-0.5"
        >
          Validate <ChevronRight size={10} />
        </button>
      </div>

      <div className="divide-y divide-[rgba(0,0,0,0.04)]">
        {CONCEPTS.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAFA] transition-colors cursor-pointer"
            onClick={() => navigate('/validate')}
          >
            {/* Score ring */}
            <div className="flex-shrink-0 w-10 h-10 relative">
              <svg width={40} height={40} viewBox="0 0 40 40">
                <circle cx={20} cy={20} r={16} fill="none" stroke="#F0F2F5" strokeWidth={3} />
                {c.score > 0 && (
                  <circle
                    cx={20} cy={20} r={16} fill="none"
                    stroke={c.score >= 75 ? '#0A0A0A' : '#D1D5DB'} strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray={`${(c.score / 100) * 100.5} 100.5`}
                    strokeDashoffset={25.1}
                    transform="rotate(-90 20 20)"
                  />
                )}
                <text x={20} y={24} textAnchor="middle" fontSize={c.score > 0 ? 11 : 8} fontWeight={700} fill="#0A0A0A">
                  {c.score > 0 ? c.score : '—'}
                </text>
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#0A0A0A] truncate">{c.name}</p>
              <p className="text-[10px] text-[#A3A3A3] mt-0.5">{c.category}</p>
            </div>

            <span
              className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0"
              style={{
                color: c.status === 'validated' ? '#22C55E'
                     : c.status === 'pending'   ? '#F59E0B'
                     :                            '#A3A3A3',
              }}
            >
              {c.status}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="px-6 py-3.5 border-t border-[rgba(0,0,0,0.05)]" style={{ background: '#FAFAFA' }}>
        <button
          onClick={() => navigate('/validate')}
          className="text-[11px] font-semibold text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors flex items-center gap-1"
        >
          New concept <Plus size={9} />
        </button>
      </div>
    </div>
  )
}

// ── Top Insights Strip ────────────────────────────────────────────────────────
interface InsightsStripProps {
  insights: Insight[]
  isLoading: boolean
  latestRunId: string | null
}

function InsightsStrip({ insights, isLoading, latestRunId }: InsightsStripProps) {
  const navigate = useNavigate()
  return (
    <div className="rounded-[20px] overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-6 py-3 flex items-center gap-2 border-b border-white/[0.06]">
        <Zap size={12} className="text-[#C8F04A]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Latest Agent Insights</span>
      </div>
      <div className="flex overflow-x-auto scrollbar-none divide-x divide-white/[0.06]">
        {isLoading ? (
          <div className="flex items-center px-6 py-4 w-full">
            <span className="text-[12px] font-medium text-white/40">Loading insights…</span>
          </div>
        ) : insights.length === 0 ? (
          <div className="flex items-center px-6 py-4 w-full">
            <span className="text-[12px] font-medium text-white/40">No insights yet. Run a report to generate market insights.</span>
          </div>
        ) : (
          insights.map((ins, i) => {
            const cfg = INSIGHT_TYPE_CONFIG[ins.insight_type] ?? { label: ins.insight_type, color: '#A3A3A3' }
            return (
              <div key={ins.id ?? i} className="flex items-start gap-3 px-6 py-4 flex-shrink-0 min-w-[240px]">
                <span className="w-0.5 h-full min-h-[36px] rounded-full flex-shrink-0 mt-0.5" style={{ background: cfg.color }} />
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider block mb-0.5 text-white/30">{cfg.label}</span>
                  <p className="text-[12px] font-medium text-white/80 leading-snug">{ins.title}</p>
                </div>
              </div>
            )
          })
        )}
        {insights.length > 0 && latestRunId && (
          <div className="flex items-center px-6 flex-shrink-0">
            <button
              onClick={() => navigate(`/reports/${latestRunId}`)}
              className="text-[11px] font-semibold text-[#C8F04A] flex items-center gap-1 hover:gap-2 transition-all whitespace-nowrap"
            >
              Full report <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Activity Feed ──────────────────────────────────────────────────────────────
function ActivityFeedCard({ runs, fill = false }: { runs: AgentRun[]; fill?: boolean }) {
  const activity = runs.slice(0, 8).map(run => {
    const cfg = RUN_STATUS_TAG[run.status] ?? RUN_STATUS_TAG.queued
    const label = run.brand_name
      ? `${run.product_category} · ${run.brand_name}`
      : run.product_category
    const text = run.status === 'completed'
      ? `${label} intelligence report completed`
      : run.status === 'failed'
        ? `${label} report failed${run.error_message ? ` — ${run.error_message}` : ''}`
        : `${label} report ${run.status}`
    return { time: formatRelativeTime(run.created_at), tag: cfg.tag, text, tagColor: cfg.tagColor }
  })

  return (
    <div className={`bg-white rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.07)] flex flex-col${fill ? ' h-full' : ''}`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(0,0,0,0.05)] flex-shrink-0">
        <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-[0.1em]">Activity</h3>
      </div>
      <div className="divide-y divide-[rgba(0,0,0,0.04)] flex-1 overflow-y-auto">
        {activity.length > 0 ? (
          activity.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 * i }}
              className="flex items-start gap-4 px-6 py-4 hover:bg-[#FAFAFA] transition-colors"
            >
              <div className="w-0.5 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ background: item.tagColor + '60' }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: item.tagColor }}>
                    {item.tag}
                  </span>
                  <span className="font-mono text-[10px] text-[#C8C8C8]">·</span>
                  <span className="font-mono text-[10px] text-[#A3A3A3]">{item.time}</span>
                </div>
                <p className="text-[12.5px] text-[#0A0A0A] leading-snug">{item.text}</p>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-[18px] bg-[#F8F9FB] border border-[rgba(0,0,0,0.07)] flex items-center justify-center mx-auto mb-5">
              <Activity size={20} className="text-[#A3A3A3]" />
            </div>
            <p className="text-[14px] font-semibold text-[#0A0A0A] mb-1.5">No activity yet</p>
            <p className="text-[13px] text-[#6B6B6B] max-w-[220px] mx-auto leading-relaxed">
              Run a report to start tracking market intelligence activity.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Compliance / Risk Widget ──────────────────────────────────────────────────
function ComplianceCard() {
  const navigate = useNavigate()
  const ITEMS = [
    { text: 'FSSAI immunity claims — clinical evidence required', level: 'warn' },
    { text: 'KSM-66 ashwagandha: dosage labeling required (Schedule 1)', level: 'info' },
    { text: 'Sugar-free cert: third-party lab test required', level: 'info' },
  ]
  return (
    <div className="bg-white rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.07)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2">
          <ShieldCheck size={13} className="text-[#A3A3A3]" />
          <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-wider">Compliance Flags</h3>
        </div>
        <span className="text-[9px] font-bold text-[#F59E0B] uppercase tracking-wider">
          {ITEMS.filter(i => i.level === 'warn').length} warning
        </span>
      </div>
      <div className="divide-y divide-[rgba(0,0,0,0.04)]">
        {ITEMS.map((item, i) => (
          <div key={i} className="flex items-start gap-3.5 px-6 py-3.5">
            <div
              className="w-0.5 self-stretch rounded-full flex-shrink-0 mt-0.5"
              style={{ background: item.level === 'warn' ? '#0A0A0A' : '#D1D5DB' }}
            />
            <p className="text-[12px] text-[#0A0A0A] leading-snug">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate          = useNavigate()
  const { user, profile } = useAuth()
  const { data: runs = [] } = useRuns()
  const [copied, setCopied] = useState(false)

  // Most recent completed run — used to fetch top insights.
  const latestCompletedRun = runs.find(r => r.status === 'completed') ?? null
  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ['insights', latestCompletedRun?.id],
    queryFn:  () => getInsights(latestCompletedRun!.id) as Promise<Insight[]>,
    enabled:  !!latestCompletedRun,
  })

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'there'
  const usagePct  = profile ? (profile.reports_used_this_month / profile.reports_limit) * 100 : 33

  const copyReferral = () => {
    navigator.clipboard.writeText(`https://productiq.in/signup?ref=${profile?.referral_code ?? 'YOURCODE'}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const completedRuns = runs.filter(r => r.status === 'completed').length
  const runningRuns   = runs.filter(r => r.status === 'running' || r.status === 'queued').length

  const sparkReports  = [1, 1, 2, 2, 3, 2, completedRuns]
  const sparkProducts = [90, 105, 118, 127, 134, 139, 142]
  const sparkReviews  = [1800, 2100, 2300, 2500, 2700, 2800, 2847]

  return (
    <div className="max-w-[1200px] mx-auto pb-16 space-y-8">

      {/* ══ Header ══ */}
      <div className="flex items-center justify-between pt-1">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-[#A3A3A3] mb-1.5">
            {getGreeting()}
          </p>
          <h1 className="text-[30px] font-bold tracking-tight text-[#0A0A0A]">
            {firstName}&rsquo;s workspace
          </h1>
          {runningRuns > 0 && (
            <p className="text-[13px] text-[#A3A3A3] mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8F04A] animate-pulse" />
              {runningRuns} report{runningRuns > 1 ? 's' : ''} currently running
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <button
            onClick={() => navigate('/intelligence')}
            className="btn btn-outline flex items-center gap-2"
          >
            Intel Feed
          </button>
          <button
            onClick={() => navigate('/reports/new')}
            className="btn btn-black flex items-center gap-2"
          >
            <Plus size={14} /> New Report
          </button>
        </motion.div>
      </div>

      {/* ══ Stats Row ══ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {[
          { value: completedRuns, label: 'Reports generated',  sub: 'this account',       delta: +33, sparkData: sparkReports },
          { value: 142,           label: 'Products analysed',  sub: 'across platforms',   delta: +8,  sparkData: sparkProducts },
          { value: 2847,          label: 'Reviews mined',      sub: 'and clustered',       delta: +12, sparkData: sparkReviews },
          { value: '~9 min',      label: 'Avg. report time',   sub: 'per full run',        accent: true },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 + 0.08 }}
          >
            <StatCard {...s} />
          </motion.div>
        ))}
      </motion.div>

      {/* ══ Insights Strip ══ */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <InsightsStrip insights={insights} isLoading={insightsLoading} latestRunId={latestCompletedRun?.id ?? null} />
      </motion.div>

      {/* ══ Main Body: 2-col + right sidebar ══ */}
      <div className="grid lg:grid-cols-[1fr_1fr_320px] gap-6">

        {/* ── Col 1 ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="flex flex-col gap-6 h-full"
        >
          {/* Recent Reports */}
          <div className="bg-white rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
              <h2 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={13} className="text-[#A3A3A3]" /> Recent Reports
              </h2>
              <div className="flex items-center gap-3">
                {runningRuns > 0 && (
                  <span className="text-[10px] font-bold bg-[#C8F04A] text-[#0A0A0A] px-2.5 py-1 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] animate-pulse" />
                    {runningRuns} running
                  </span>
                )}
                <button className="text-[11px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
                  View all
                </button>
              </div>
            </div>

            <div className="px-6">
              {runs.length > 0 ? (
                runs.slice(0, 6).map((run, i) => (
                  <motion.div
                    key={run.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 * i }}
                  >
                    <RunRow run={run} />
                  </motion.div>
                ))
              ) : (
                <div className="py-16 text-center">
                  <div className="w-14 h-14 rounded-[18px] bg-[#F8F9FB] border border-[rgba(0,0,0,0.07)] flex items-center justify-center mx-auto mb-5">
                    <FileText size={20} className="text-[#A3A3A3]" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#0A0A0A] mb-1.5">No reports yet</p>
                  <p className="text-[13px] text-[#6B6B6B] mb-6 max-w-[200px] mx-auto leading-relaxed">
                    Run your first intelligence report in 10 minutes.
                  </p>
                  <button onClick={() => navigate('/reports/new')} className="btn btn-black btn-sm">
                    New Report
                  </button>
                </div>
              )}
            </div>

            {runs.length > 0 && (
              <div className="px-6 py-4 border-t border-[rgba(0,0,0,0.05)]" style={{ background: '#FAFAFA' }}>
                <button
                  onClick={() => navigate('/reports/new')}
                  className="flex items-center gap-2 text-[11px] font-semibold text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors"
                >
                  <Plus size={11} /> New Report
                </button>
              </div>
            )}
          </div>

          {/* Activity Feed — grows to fill remaining col height */}
          <div className="flex-1 min-h-0">
            <ActivityFeedCard runs={runs} fill />
          </div>
        </motion.div>

        {/* ── Col 2 ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="flex flex-col gap-6"
        >
          {/* Market Snapshot */}
          <MarketSnapshotCard />

          {/* Concept Pipeline */}
          <ConceptPipelineCard />

          {/* Compliance Flags */}
          <ComplianceCard />
        </motion.div>

        {/* ── Right Sidebar ── */}
        <div className="flex flex-col gap-5 h-full">

          {/* Brand Health */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.28 }}>
            <BrandHealthCard />
          </motion.div>

          {/* Active Agents */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.32 }}>
            <ActiveAgentsCard />
          </motion.div>

          {/* Usage */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.36 }}
            className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-wider">Usage</h3>
              {profile?.plan === 'free' && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="text-[11px] font-bold text-[#0A0A0A] bg-[#C8F04A] px-2.5 py-1 rounded-full hover:bg-[#d4f560] transition-colors"
                >
                  Upgrade
                </button>
              )}
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-[#F0F2F5] mb-3">
              <motion.div
                className="h-full rounded-full"
                style={{ background: usagePct > 80 ? '#EF4444' : usagePct > 60 ? '#F59E0B' : '#0A0A0A' }}
                initial={{ width: 0 }}
                animate={{ width: `${usagePct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-[12px] text-[#6B6B6B]">
              <strong className="text-[#0A0A0A]">{profile?.reports_used_this_month ?? 1}</strong>
              {' '}of{' '}
              <strong className="text-[#0A0A0A]">{profile?.reports_limit ?? 3}</strong>
              {' '}reports this month
            </p>
          </motion.div>

          {/* Referral — flex-1 fills remaining sidebar height */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-[20px] p-6 flex-1"
            style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <ArrowUpRight size={12} className="text-[#C8F04A]" />
              <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">Unlock more reports</h3>
            </div>
            <p className="text-[12px] text-white/40 mb-5 leading-relaxed">
              Each referral unlocks 2 extra reports — no payment needed.
            </p>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] mb-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <code className="flex-1 text-[10px] font-mono text-white/50 truncate">
                productiq.in/signup?ref={profile?.referral_code ?? 'YOURCODE'}
              </code>
              <button
                onClick={copyReferral}
                className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-[#C8F04A] transition-colors"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </div>
            <p className="text-[10px] text-white/20">
              {profile?.extra_reports_from_referrals ?? 0} bonus reports unlocked
            </p>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
