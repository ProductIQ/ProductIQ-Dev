// src/pages/ComparePage.tsx
// Run Comparator — side-by-side diff view.
// Design: matches Dashboard — white cards, dark header strip, typographic rows.

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, TrendingUp, TrendingDown, ChevronDown,
  Plus, Minus, ArrowLeftRight,
} from 'lucide-react'
import { compareRuns, listReports } from '@/lib/api'
import type { RunDelta } from '@/lib/mockData'
import type { AgentRun } from '@/types/agent'

// ── Section card — same white card pattern ───────────────────────────────────
function Section({
  title, count, children,
}: {
  title: string
  count?: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAFAFA] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#0A0A0A]">{title}</h3>
          {count !== undefined && (
            <span className="text-[10px] font-bold text-[#A3A3A3]">· {count}</span>
          )}
        </div>
        <ChevronDown
          size={13}
          className="text-[#C8C8C8] transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-[rgba(0,0,0,0.05)]"
          >
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Impact label — text only, no colored backgrounds ────────────────────────
function ImpactLabel({ impact }: { impact: 'high' | 'medium' | 'low' }) {
  const color = impact === 'high' ? '#0A0A0A' : '#A3A3A3'
  return (
    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>
      {impact}
    </span>
  )
}

// ── Velocity bar — B&W bars showing direction ────────────────────────────────
function VelocityRow({ trend, before, after, delta }: { trend: string; before: number; after: number; delta: number }) {
  const isUp  = delta > 0
  const maxV  = Math.max(before, after, 1)
  return (
    <div className="py-3 border-b border-[rgba(0,0,0,0.04)] last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[12px] font-semibold text-[#0A0A0A]">{trend}</p>
        <span className="text-[11px] font-semibold flex items-center gap-0.5"
          style={{ color: isUp ? '#22C55E' : '#EF4444' }}>
          {isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {isUp ? '+' : ''}{delta.toFixed(0)}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-[#F0F2F5] overflow-hidden">
          <div className="h-full bg-[#D1D5DB] rounded-full" style={{ width: `${(before / maxV) * 100}%` }} />
        </div>
        <span className="text-[9px] font-mono text-[#A3A3A3] w-5 text-center">→</span>
        <div className="flex-1 h-1 rounded-full bg-[#F0F2F5] overflow-hidden">
          <div className="h-full rounded-full" style={{
            width: `${(after / maxV) * 100}%`,
            background: isUp ? '#0A0A0A' : '#A3A3A3',
          }} />
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export function ComparePage() {
  const navigate = useNavigate()
  const [baseRunId, setBaseRunId]       = useState<string>('')
  const [compareRunId, setCompareRunId] = useState<string>('')

  // ── Fetch list of runs for the dropdowns ──
  const { data: runs } = useQuery<AgentRun[]>({
    queryKey: ['runs'],
    queryFn:  listReports,
  })

  // ── Fetch comparison data only when both runs are selected ──
  const { data: delta, isLoading } = useQuery<RunDelta>({
    queryKey:  ['compare', baseRunId, compareRunId],
    queryFn:   () => compareRuns(baseRunId, compareRunId),
    enabled:   !!baseRunId && !!compareRunId && baseRunId !== compareRunId,
  })

  const bothSelected = !!baseRunId && !!compareRunId && baseRunId !== compareRunId

  // ── Helper to render a run label in the dropdown ──
  const runLabel = (r?: AgentRun) =>
    r ? `${r.product_category}${r.brand_name ? ` · ${r.brand_name}` : ''}` : ''

  return (
    <div className="max-w-[860px] mx-auto pb-12">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#A3A3A3] mb-1">Intelligence Delta</p>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">Run Comparator</h1>
        </motion.div>
        <motion.button
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/reports/new')}
          className="btn btn-black"
        >
          New run
        </motion.button>
      </div>

      {/* ── Run selector — dark strip matching dashboard insight strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="rounded-[20px] overflow-hidden mb-6"
        style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="px-5 py-2.5 flex items-center gap-2 border-b border-white/5">
          <ArrowLeftRight size={11} className="text-white/30" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Comparing</span>
        </div>
        <div className="flex items-center gap-0 divide-x divide-white/5">
          <div className="flex-1 px-5 py-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 mb-1">Base</p>
            <select
              value={baseRunId}
              onChange={e => setBaseRunId(e.target.value)}
              className="w-full bg-transparent text-[14px] font-semibold text-white outline-none cursor-pointer"
              style={{ appearance: 'none' }}
            >
              <option value="" className="text-[#0A0A0A]">Select base run…</option>
              {runs?.map(r => (
                <option key={r.id} value={r.id} className="text-[#0A0A0A]">
                  {runLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 px-5 py-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 mb-1">Compare</p>
            <select
              value={compareRunId}
              onChange={e => setCompareRunId(e.target.value)}
              className="w-full bg-transparent text-[14px] font-semibold text-white outline-none cursor-pointer"
              style={{ appearance: 'none' }}
            >
              <option value="" className="text-[#0A0A0A]">Select compare run…</option>
              {runs?.map(r => (
                <option key={r.id} value={r.id} className="text-[#0A0A0A]">
                  {runLabel(r)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* ── Empty state — no runs selected ── */}
      {!bothSelected && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] px-5 py-16 text-center"
        >
          <ArrowLeftRight size={20} className="text-[#C8C8C8] mx-auto mb-3" />
          <p className="text-[13px] text-[#A3A3A3] leading-relaxed">
            Select two reports to compare their insights, competitors, and sentiment changes.
          </p>
        </motion.div>
      )}

      {/* ── Loading state ── */}
      {bothSelected && isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] px-5 py-16 text-center"
        >
          <div className="h-5 w-5 mx-auto mb-3 rounded-full border-2 border-[#E5E5E5] border-t-[#0A0A0A] animate-spin" />
          <p className="text-[13px] text-[#A3A3A3]">Comparing runs…</p>
        </motion.div>
      )}

      {/* ── Comparison results ── */}
      {bothSelected && delta && (
        <>
      {/* ── AI Summary — inline, not a banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] px-5 py-4 mb-5"
      >
        <p className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">Summary</p>
        <p className="text-[13px] text-[#0A0A0A] leading-relaxed">{delta.summary}</p>
      </motion.div>

      {/* ── New Insights ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <Section title="New insights" count={delta.newInsights.length}>
          <div className="divide-y divide-[rgba(0,0,0,0.04)]">
            {delta.newInsights.map((ins, i) => (
              <motion.div
                key={ins.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3.5 py-3 first:pt-0 last:pb-0"
              >
                {/* Left accent line — green for new */}
                <div className="w-0.5 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ background: '#0A0A0A' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3]">{ins.type}</span>
                    <ImpactLabel impact={ins.impact} />
                    <span className="text-[9px] font-bold text-[#A3A3A3] ml-auto">NEW</span>
                  </div>
                  <p className="text-[13px] font-medium text-[#0A0A0A] leading-snug">{ins.text}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {delta.removedInsights.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">No longer applies</p>
              {delta.removedInsights.map((r, i) => (
                <div key={i} className="flex items-start gap-3 py-1.5">
                  <div className="w-0.5 self-stretch rounded-full bg-[#D1D5DB] flex-shrink-0" />
                  <p className="text-[12px] text-[#A3A3A3] line-through">{r}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </motion.div>

      {/* ── Competitor moves ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <Section title="Competitor moves" count={delta.competitorChanges.length}>
          <div className="divide-y divide-[rgba(0,0,0,0.04)]">
            {delta.competitorChanges.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0"
              >
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: '#0F0F0F', color: '#C8F04A' }}
                >
                  {c.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#0A0A0A]">{c.name}</p>
                  <p className="text-[11px] text-[#6B6B6B]">{c.change}</p>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3]">
                  {c.type}
                </span>
              </motion.div>
            ))}
          </div>
        </Section>
      </motion.div>

      {/* ── Trend velocity ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <Section title="Trend velocity" count={delta.trendVelocityChanges.length}>
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-3">
            <span>Base run</span>
            <span>Compare run</span>
          </div>
          {delta.trendVelocityChanges.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <VelocityRow
                trend={t.trend}
                before={t.before}
                after={t.after}
                delta={t.delta}
              />
            </motion.div>
          ))}
        </Section>
      </motion.div>

      {/* ── Price movements ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
        <Section title="Price movements" count={delta.priceShifts.length}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.06)]">
                {['Product', 'Base', 'Compare', 'Change'].map(h => (
                  <th key={h} className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3] pb-2.5 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.04)]">
              {delta.priceShifts.map((p, i) => (
                <tr key={i}>
                  <td className="py-3 pr-4 text-[12px] font-medium text-[#0A0A0A]">{p.product}</td>
                  <td className="py-3 pr-4 text-[12px] font-mono text-[#A3A3A3]">
                    {p.before > 0 ? `₹${p.before.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="py-3 pr-4 text-[12px] font-mono font-semibold text-[#0A0A0A]">
                    ₹{p.after.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3">
                    {p.before > 0 ? (
                      <span className="text-[11px] font-semibold flex items-center gap-0.5"
                        style={{ color: p.pct < 0 ? '#EF4444' : '#22C55E' }}>
                        {p.pct < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                        {p.pct > 0 ? '+' : ''}{p.pct.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-[#A3A3A3] uppercase tracking-wider">New</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </motion.div>

      {/* ── Actions ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3"
      >
        <button
          onClick={() => navigate(`/reports/${baseRunId}`)}
          className="btn btn-black flex-1 flex items-center justify-center gap-2"
        >
          View base report <ArrowRight size={13} />
        </button>
        <button
          onClick={() => navigate('/validate')}
          className="btn btn-outline flex-1"
        >
          Validate a concept
        </button>
      </motion.div>
        </>
      )}
    </div>
  )
}
