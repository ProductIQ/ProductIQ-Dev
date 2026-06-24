// src/components/report/GTMSection.tsx
import { motion } from 'motion/react'
import { CheckCircle2 } from 'lucide-react'
import { formatINR } from '@/lib/utils'
import type { GTMPlan } from '@/types/report'

interface Channel {
  name: string
  roi: 'Highest' | 'High' | 'Medium' | 'Low'
  reason: string
}

interface TimelinePhase {
  week: string
  phase: string
  color: string
  items: string[]
}

interface BudgetItem {
  label: string
  amount: number
  pct: number
}

interface GTMSectionProps {
  gtmPlan?: GTMPlan | null
  /** Fallback mock data when no real plan exists */
  channels?: Channel[]
  timeline?: TimelinePhase[]
  budget?: BudgetItem[]
}

const DEFAULT_CHANNELS: Channel[] = [
  { name: 'Amazon PPC (Sponsored Products)',        roi: 'Highest', reason: 'Capture existing high-intent demand directly from category search.' },
  { name: 'Health/fitness micro-influencers (50K–200K)', roi: 'High', reason: '47% of purchase decisions attributed to influencer recommendations in this category.' },
  { name: 'Meesho social commerce',                 roi: 'High',    reason: 'Fastest-growing channel in Tier 2; low competition from established brands.' },
  { name: 'Reddit r/fitness + r/IndianFoodHacks',   roi: 'Medium',  reason: 'Community is brand-discovery-ready — 300+ organic mentions found.' },
  { name: 'Google Search (non-brand)',               roi: 'Medium',  reason: 'High-intent keywords with zero competitor ads — clear whitespace.' },
]

const DEFAULT_TIMELINE: TimelinePhase[] = [
  {
    week: 'Week 1–2', phase: 'Foundation', color: '#C8F04A',
    items: ['Finalise FSSAI claim list', 'Lock flavour formula', 'Brief creative agency'],
  },
  {
    week: 'Week 3–4', phase: 'Pre-launch', color: '#F59E0B',
    items: ['Amazon listing optimisation + A+ content', 'Seed 10 micro-influencers (gifting)', 'Meesho catalogue setup'],
  },
  {
    week: 'Week 5–8', phase: 'Launch', color: '#22C55E',
    items: ['Amazon PPC campaign go-live', 'Influencer posts go live', 'Reddit organic seeding'],
  },
  {
    week: 'Week 9–12', phase: 'Optimise', color: '#0EA5E9',
    items: ['Review ACOS, pause underperforming ad groups', 'Scale 3 top influencers', 'Expand to Flipkart listing'],
  },
]

const DEFAULT_BUDGET: BudgetItem[] = [
  { label: 'Amazon PPC',  amount: 150000, pct: 37 },
  { label: 'Influencers', amount: 120000, pct: 30 },
  { label: 'Creative',    amount: 60000,  pct: 15 },
  { label: 'Other',       amount: 72000,  pct: 18 },
]

const ROI_BADGE: Record<string, { bg: string; text: string }> = {
  Highest: { bg: '#0F0F0F',  text: '#C8F04A' },
  High:    { bg: '#dcfce7',  text: '#16A34A' },
  Medium:  { bg: 'rgba(0,0,0,0.07)', text: '#A3A3A3' },
  Low:     { bg: '#fee2e2',  text: '#EF4444' },
}

export function GTMSection({ gtmPlan, channels, timeline, budget }: GTMSectionProps) {
  const displayChannels = channels ?? DEFAULT_CHANNELS
  const displayTimeline = timeline ?? DEFAULT_TIMELINE
  const displayBudget   = budget   ?? DEFAULT_BUDGET
  const totalBudget = displayBudget.reduce((s, b) => s + b.amount, 0)

  return (
    <div className="space-y-6">
      {/* ── Launch Channels ── */}
      <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
          <h3 className="text-[14px] font-bold text-[#0A0A0A]">Recommended launch channels</h3>
          <p className="text-[12px] text-[#A3A3A3] mt-0.5">Ranked by estimated ROI for this category</p>
        </div>
        {displayChannels.map((ch, i) => {
          const badge = ROI_BADGE[ch.roi] ?? ROI_BADGE.Medium
          return (
            <motion.div
              key={ch.name}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`flex items-start gap-4 px-6 py-4 ${i < displayChannels.length - 1 ? 'border-b border-[rgba(0,0,0,0.04)]' : ''}`}
            >
              {/* Rank */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                style={{ background: '#0F0F0F', color: '#C8F04A' }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] font-semibold text-[#0A0A0A]">{ch.name}</p>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: badge.bg, color: badge.text }}
                  >
                    {ch.roi} ROI
                  </span>
                </div>
                <p className="text-[12px] text-[#6B6B6B] mt-1 leading-relaxed">{ch.reason}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── 90-Day Timeline ── */}
      <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
        <h3 className="text-[14px] font-bold text-[#0A0A0A] mb-5">90-day launch timeline</h3>
        <div className="relative">
          {/* Vertical spine */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5" style={{ background: 'rgba(0,0,0,0.08)' }} />
          <div className="space-y-6">
            {displayTimeline.map((phase, i) => (
              <motion.div
                key={phase.week}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-5 pl-10 relative"
              >
                {/* Dot */}
                <div
                  className="absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 border-white -translate-x-1/2 flex-shrink-0"
                  style={{ background: phase.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">
                      {phase.week}
                    </span>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: phase.color + '28', color: phase.color }}
                    >
                      {phase.phase}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {phase.items.map(item => (
                      <li key={item} className="flex items-center gap-2 text-[13px] text-[#444]">
                        <CheckCircle2 size={11} style={{ color: phase.color }} className="flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Budget overview ── */}
      <div
        className="rounded-[20px] p-6 text-white"
        style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h3 className="text-[13px] font-semibold mb-5 text-white/70 uppercase tracking-wider text-[10px]">
          90-Day budget estimate
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
          {displayBudget.map(b => (
            <div key={b.label}>
              <div className="text-[11px] text-white/40 mb-1">{b.label}</div>
              <div className="text-[20px] font-bold text-white mb-1.5">
                {formatINR(b.amount)}
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${b.pct}%`, background: '#C8F04A' }}
                />
              </div>
              <div className="text-[10px] text-white/30 mt-1">{b.pct}% of total</div>
            </div>
          ))}
        </div>
        <div
          className="border-t pt-4 flex items-center justify-between"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <span className="text-[13px] text-white/50">Total 90-day budget</span>
          <span className="text-[20px] font-bold" style={{ color: '#C8F04A' }}>
            {formatINR(totalBudget)}
          </span>
        </div>
      </div>
    </div>
  )
}
