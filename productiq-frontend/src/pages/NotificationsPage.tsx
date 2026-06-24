// src/pages/NotificationsPage.tsx
// Notification hub — alert center + preference management.
// Design: matches Dashboard — white card, dark strip, RunRow-style notification rows.

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronRight, X, Check, Bell, BellOff } from 'lucide-react'
import {
  MOCK_NOTIFICATIONS,
  type Notification,
} from '@/lib/mockData'
import { timeAgo } from '@/lib/mockData'

// ── Category label — text only ───────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  ALERT: 'Alert',
  REPORT: 'Report',
  PRICE: 'Price',
  SYSTEM: 'System',
  COMPETITOR: 'Competitor',
  SENTIMENT: 'Sentiment',
}

// ── Single notification row ──────────────────────────────────────────────────
function NotifRow({
  notif,
  onRead,
  onDelete,
}: {
  notif: Notification
  onRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const label = CATEGORY_LABELS[notif.category] ?? notif.category

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      className="border-b border-[rgba(0,0,0,0.05)] last:border-0"
    >
      <div
        className="flex items-start gap-3.5 px-5 py-4 hover:bg-[#FAFAFA] cursor-pointer transition-colors group"
        onClick={() => { setOpen(v => !v); if (!notif.isRead) onRead(notif.id) }}
      >
        {/* Unread dot */}
        <div className="flex-shrink-0 mt-1.5">
          {notif.isRead
            ? <div className="w-1.5 h-1.5 rounded-full border border-[rgba(0,0,0,0.15)]" />
            : <div className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A]" />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#A3A3A3]">{label}</span>
            <span className="text-[9px] font-medium text-[#A3A3A3] uppercase tracking-wider">{notif.brand}</span>
            <span className="font-mono text-[10px] text-[#C8C8C8] ml-auto flex-shrink-0">
              {timeAgo(notif.timestamp)}
            </span>
          </div>
          <p className={`text-[13px] leading-snug ${notif.isRead ? 'text-[#6B6B6B] font-normal' : 'text-[#0A0A0A] font-semibold'}`}>
            {notif.title}
          </p>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="overflow-hidden"
              >
                <p className="text-[12px] text-[#6B6B6B] leading-relaxed mt-2.5 pr-4">{notif.body}</p>
                <div className="flex items-center gap-4 mt-3">
                  {notif.actionLabel && (
                    <button className="text-[11px] font-semibold text-[#0A0A0A] flex items-center gap-1 hover:gap-1.5 transition-all">
                      {notif.actionLabel} <ChevronRight size={10} />
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(notif.id) }}
                    className="text-[11px] text-[#A3A3A3] hover:text-[#EF4444] transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={e => { e.stopPropagation(); onDelete(notif.id) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#C8C8C8] hover:text-[#0A0A0A] ml-1 flex-shrink-0"
        >
          <X size={12} />
        </button>
      </div>
    </motion.div>
  )
}

// ── Preference toggle ────────────────────────────────────────────────────────
const PREF_ITEMS = [
  { id: 'price_alerts',      label: 'Price change alerts',       sub: 'Competitor price movements above threshold' },
  { id: 'sentiment_alerts',  label: 'Sentiment alerts',          sub: 'Brand health score drops or spikes' },
  { id: 'report_done',       label: 'Report complete',           sub: 'When a run finishes processing' },
  { id: 'competitor_launch', label: 'Competitor launches',       sub: 'New SKU or product detected' },
  { id: 'trend_breakout',    label: 'Trend breakouts',           sub: 'Keyword velocity enters critical phase' },
  { id: 'weekly_digest',     label: 'Weekly digest',             sub: 'Summary of all activity, every Monday' },
]

// ── Filter type ──────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'unread' | 'alerts' | 'reports'

// ── Main page ────────────────────────────────────────────────────────────────
export function NotificationsPage() {
  const [notifs, setNotifs]  = useState<Notification[]>(MOCK_NOTIFICATIONS)
  const [tab, setTab]        = useState<FilterTab>('all')
  const [prefs, setPrefs]    = useState<Record<string, boolean>>(
    Object.fromEntries(PREF_ITEMS.map(p => [p.id, true]))
  )

  const markRead   = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  const dismiss    = (id: string) => setNotifs(prev => prev.filter(n => n.id !== id))
  const markAll    = () => setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
  const togglePref = (id: string) => setPrefs(p => ({ ...p, [id]: !p[id] }))

  const filtered = notifs.filter(n => {
    if (tab === 'unread')  return !n.isRead
    if (tab === 'alerts')  return n.category === 'ALERT' || n.category === 'PRICE' || n.category === 'COMPETITOR' || n.category === 'SENTIMENT'
    if (tab === 'reports') return n.category === 'REPORT' || n.category === 'SYSTEM'
    return true
  })

  const unread = notifs.filter(n => !n.isRead).length

  return (
    <div className="max-w-[860px] mx-auto pb-12">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#A3A3A3] mb-1">Workspace</p>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">Notifications</h1>
          <p className="text-[13px] text-[#A3A3A3] mt-1">
            {notifs.length} total{unread > 0 ? ` · ${unread} unread` : ' · all read'}
          </p>
        </motion.div>
        {unread > 0 && (
          <motion.button
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={markAll}
            className="btn btn-outline btn-sm flex items-center gap-1.5"
          >
            <Check size={11} /> Mark all read
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-5">
        {/* Left — feed */}
        <div>
          {/* Filter tabs */}
          <div className="flex items-center gap-0.5 mb-4 bg-white rounded-[14px] p-1 border border-[rgba(0,0,0,0.07)] w-fit">
            {([
              { key: 'all',     label: `All${notifs.length > 0 ? ` · ${notifs.length}` : ''}` },
              { key: 'unread',  label: `Unread${unread > 0 ? ` · ${unread}` : ''}` },
              { key: 'alerts',  label: 'Alerts' },
              { key: 'reports', label: 'Reports' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setTab(f.key)}
                className="px-3.5 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all"
                style={{
                  background: tab === f.key ? '#0F0F0F' : 'transparent',
                  color:      tab === f.key ? '#fff'     : '#6B6B6B',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-[13px] font-semibold text-[#0A0A0A] mb-1">Nothing here</p>
                <p className="text-[12px] text-[#A3A3A3]">Switch filter or check back later.</p>
              </div>
            ) : (
              <AnimatePresence>
                {filtered.map(n => (
                  <NotifRow key={n.id} notif={n} onRead={markRead} onDelete={dismiss} />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right — preferences */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden sticky top-4">
            <div className="px-5 py-3.5 border-b border-[rgba(0,0,0,0.05)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">Alert preferences</p>
            </div>
            <div className="divide-y divide-[rgba(0,0,0,0.04)]">
              {PREF_ITEMS.map(pref => (
                <div key={pref.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#0A0A0A] leading-snug">{pref.label}</p>
                    <p className="text-[10px] text-[#A3A3A3] mt-0.5 leading-snug">{pref.sub}</p>
                  </div>
                  {/* Toggle — custom B&W pill */}
                  <button
                    onClick={() => togglePref(pref.id)}
                    className="flex-shrink-0 mt-0.5 w-8 h-4 rounded-full relative transition-all"
                    style={{
                      background: prefs[pref.id] ? '#0A0A0A' : '#E5E7EB',
                    }}
                  >
                    <span
                      className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                      style={{ left: prefs[pref.id] ? 17 : 2 }}
                    />
                  </button>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-[rgba(0,0,0,0.05)]" style={{ background: '#FAFAFA' }}>
              <button className="btn btn-black btn-sm w-full">Save preferences</button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
