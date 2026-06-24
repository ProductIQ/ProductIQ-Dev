// src/pages/IntelligencePage.tsx
// Intelligence Feed — real-time event stream.
// Design: matches existing DashboardPage — white cards, #0F0F0F accent strip,
// #A3A3A3 labels, border-[rgba(0,0,0,0.07)], no emojis, no colorful badges.

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, ChevronRight, Check, RefreshCw,
  TrendingUp, TrendingDown, Activity,
} from 'lucide-react'
import {
  MOCK_INTEL_EVENTS,
  MOCK_BRANDS,
  getEventColor,
  timeAgo,
  type IntelEvent,
} from '@/lib/mockData'

// ── Severity dot — minimal, just a small dot in the left gutter ─────────────
function SeverityDot({ severity, isRead }: { severity: string; isRead: boolean }) {
  if (isRead) return <div className="w-1.5 h-1.5 rounded-full bg-transparent border border-[rgba(0,0,0,0.15)] flex-shrink-0 mt-1.5" />
  if (severity === 'critical') return <div className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] flex-shrink-0 mt-1.5" />
  if (severity === 'warning')  return <div className="w-1.5 h-1.5 rounded-full bg-[#A3A3A3] flex-shrink-0 mt-1.5" />
  return <div className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] flex-shrink-0 mt-1.5" />
}

// ── Event type label — text only, no colored backgrounds ────────────────────
function TypeLabel({ type }: { type: string }) {
  let label = 'UPDATE'
  if (type.startsWith('alert.competitor')) label = 'COMPETITOR'
  else if (type.startsWith('alert.price'))  label = 'PRICE'
  else if (type.startsWith('alert.sentiment')) label = 'SENTIMENT'
  else if (type.startsWith('alert.trend'))  label = 'TREND'
  else if (type.startsWith('intelligence.')) label = 'INSIGHT'
  else if (type === 'run.completed')         label = 'RUN'

  return (
    <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#A3A3A3]">
      {label}
    </span>
  )
}

// ── Single event row ─────────────────────────────────────────────────────────
function EventRow({
  event,
  onRead,
}: {
  event: IntelEvent
  onRead: (id: string) => void
}) {
  const navigate  = useNavigate()
  const [open, setOpen] = useState(false)

  const handleClick = () => {
    if (!event.isRead) onRead(event.id)
    setOpen(v => !v)
  }

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (event.type === 'run.completed' || event.type === 'intelligence.insight_ready') {
      navigate(`/reports/${(event.payload?.run_id as string) ?? 'mock-run-001'}`)
    } else if (event.type.startsWith('alert.competitor')) {
      navigate('/compare')
    } else {
      navigate('/sentiment')
    }
  }

  return (
    <div
      className="border-b border-[rgba(0,0,0,0.05)] last:border-0 group cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3.5 px-5 py-4 hover:bg-[#FAFAFA] transition-colors">
        <SeverityDot severity={event.severity} isRead={event.isRead} />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2.5 mb-1">
            <TypeLabel type={event.type} />
            <span className="text-[9px] font-medium text-[#C8C8C8] uppercase tracking-wider">
              {event.brandName}
            </span>
            <span className="font-mono text-[10px] text-[#C8C8C8] ml-auto flex-shrink-0">
              {timeAgo(event.timestamp)}
            </span>
          </div>
          <p className={`text-[13px] leading-snug ${event.isRead ? 'text-[#6B6B6B] font-normal' : 'text-[#0A0A0A] font-semibold'}`}>
            {event.title}
          </p>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <p className="text-[12px] text-[#6B6B6B] leading-relaxed mt-2.5 pr-4">
                  {event.body}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <button
                    onClick={handleAction}
                    className="text-[11px] font-semibold text-[#0A0A0A] flex items-center gap-1 hover:gap-1.5 transition-all"
                  >
                    View details <ArrowRight size={10} />
                  </button>
                  {!event.isRead && (
                    <button
                      onClick={e => { e.stopPropagation(); onRead(event.id) }}
                      className="text-[11px] text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ChevronRight
          size={13}
          className="flex-shrink-0 text-[#D1D5DB] mt-0.5 transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : 'none' }}
        />
      </div>
    </div>
  )
}

// ── Summary stat — purely typographic ───────────────────────────────────────
function InlineStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[22px] font-bold tracking-tight text-[#0A0A0A]">{value}</span>
      <span className="text-[11px] font-medium text-[#A3A3A3]">{label}</span>
    </div>
  )
}

// ── Simulated live events ────────────────────────────────────────────────────
const SIMULATED: Omit<IntelEvent, 'id' | 'timestamp' | 'isRead'>[] = [
  {
    type: 'alert.price_change', severity: 'warning',
    title: 'Optimum Nutrition raised price by ₹200 on Amazon',
    body: 'Detected a ₹200 upward price move across 3 SKUs. Possibly repositioning after MuscleBlaze recent discount.',
    brandId: 'brand-001', brandName: 'ProteinX',
  },
  {
    type: 'alert.trend_breakout', severity: 'info',
    title: '"Collagen protein bar" trend entering breakout phase',
    body: 'Velocity +218% vs 7-day average. Estimated mainstream peak: 4–6 weeks.',
    brandId: 'brand-002', brandName: 'GlowLabs',
  },
]

// ── Filter tab ───────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'alerts' | 'insights' | 'unread'

// ── Main page ────────────────────────────────────────────────────────────────
export function IntelligencePage() {
  const [events, setEvents]   = useState<IntelEvent[]>(MOCK_INTEL_EVENTS)
  const [tab, setTab]         = useState<FilterTab>('all')
  const [brand, setBrand]     = useState('all')
  const [isLive, setIsLive]   = useState(true)
  const simIdx                = useRef(0)

  useEffect(() => {
    if (!isLive) return
    const t = setInterval(() => {
      const template = SIMULATED[simIdx.current % SIMULATED.length]
      setEvents(prev => [{
        ...template,
        id: `live-${Date.now()}`,
        timestamp: new Date().toISOString(),
        isRead: false,
      }, ...prev])
      simIdx.current += 1
    }, 22000)
    return () => clearInterval(t)
  }, [isLive])

  const markRead = (id: string) =>
    setEvents(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e))
  const markAll = () =>
    setEvents(prev => prev.map(e => ({ ...e, isRead: true })))

  const filtered = events.filter(e => {
    if (brand !== 'all' && e.brandId !== brand) return false
    if (tab === 'alerts')   return e.type.startsWith('alert.')
    if (tab === 'insights') return e.type.startsWith('intelligence.') || e.type === 'run.completed'
    if (tab === 'unread')   return !e.isRead
    return true
  })

  const unread   = events.filter(e => !e.isRead).length
  const critical = events.filter(e => e.severity === 'critical').length
  const alerts   = events.filter(e => e.type.startsWith('alert.')).length

  return (
    <div className="max-w-[820px] mx-auto pb-12">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#A3A3A3] mb-1">Live Intelligence</p>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">Intelligence Feed</h1>
          <p className="text-[13px] text-[#A3A3A3] mt-1 flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: isLive ? '#C8F04A' : '#D1D5DB', animation: isLive ? 'pulse 2s infinite' : 'none' }}
            />
            <button onClick={() => setIsLive(v => !v)} className="hover:text-[#0A0A0A] transition-colors">
              {isLive ? 'Live' : 'Paused'} · {events.length} events
            </button>
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAll} className="btn btn-outline btn-sm">
              Mark all read
            </button>
          )}
          <button
            onClick={() => setEvents([...MOCK_INTEL_EVENTS])}
            className="btn btn-black btn-sm flex items-center gap-1.5"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </motion.div>
      </div>

      {/* ── Stats strip (dark bar) ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="rounded-[20px] px-6 py-4 mb-6 flex items-center gap-8"
        style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {[
          { value: unread,   label: 'unread' },
          { value: alerts,   label: 'alerts' },
          { value: critical, label: 'critical' },
          { value: events.length, label: 'total' },
        ].map(({ value, label }) => (
          <div key={label}>
            <div className="text-[22px] font-bold text-white leading-none">{value}</div>
            <div className="text-[10px] font-medium text-white/30 uppercase tracking-wider mt-0.5">{label}</div>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <select
            value={brand}
            onChange={e => setBrand(e.target.value)}
            className="text-[11px] font-medium text-white bg-transparent border border-white/10 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
          >
            <option value="all" style={{ background: '#1a1a1a' }}>All brands</option>
            {MOCK_BRANDS.map(b => (
              <option key={b.id} value={b.id} style={{ background: '#1a1a1a' }}>{b.brandName}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* ── Filter tabs ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-0.5 mb-4 bg-white rounded-[14px] p-1 border border-[rgba(0,0,0,0.07)] w-fit"
      >
        {(['all', 'alerts', 'insights', 'unread'] as FilterTab[]).map(f => (
          <button
            key={f}
            onClick={() => setTab(f)}
            className="px-4 py-2 rounded-[10px] text-[12px] font-semibold transition-all capitalize"
            style={{
              background: tab === f ? '#0F0F0F' : 'transparent',
              color: tab === f ? '#fff' : '#6B6B6B',
            }}
          >
            {f === 'unread' && unread > 0 ? `Unread · ${unread}` : f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </motion.div>

      {/* ── Feed ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.14 }}
        className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden"
      >
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[13px] font-semibold text-[#0A0A0A] mb-1">Nothing here</p>
            <p className="text-[12px] text-[#A3A3A3]">Try switching to "All" or changing the brand filter.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((evt, i) => (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: Math.min(i * 0.025, 0.2) }}
              >
                <EventRow event={evt} onRead={markRead} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>

    </div>
  )
}
