// src/components/report/ConsumerIntelTab.tsx
// Consumer Intelligence tab for ReportViewPage
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { ClusterBubbleChart } from '@/components/charts/ClusterBubbleChart'
import type { ReviewCluster } from '@/types/report'

// ── Sentiment segmented bar ──────────────────────────────────────
interface SentimentBarProps {
  positive: number
  neutral: number
  negative: number
}
function SentimentBar({ positive, neutral, negative }: SentimentBarProps) {
  const total = positive + neutral + negative || 1
  const pct = (v: number) => `${Math.round((v / total) * 100)}%`

  const segments = [
    { label: 'Positive', pct: (v => Math.round((v / total) * 100))(positive), bg: '#22C55E', text: '#fff' },
    { label: 'Neutral',  pct: (v => Math.round((v / total) * 100))(neutral),  bg: '#D1D5DB', text: '#6B6B6B' },
    { label: 'Negative', pct: (v => Math.round((v / total) * 100))(negative), bg: '#EF4444', text: '#fff' },
  ]

  return (
    <div>
      <div className="flex h-7 rounded-full overflow-hidden gap-0.5 mb-2">
        {segments.map(seg => (
          <motion.div
            key={seg.label}
            className="flex items-center justify-center text-[10px] font-bold overflow-hidden"
            style={{ background: seg.bg, color: seg.text }}
            initial={{ width: 0 }}
            animate={{ width: seg.pct + '%' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {seg.pct >= 8 && `${seg.pct}%`}
          </motion.div>
        ))}
      </div>
      <div className="flex gap-4">
        {segments.map(seg => (
          <span key={seg.label} className="flex items-center gap-1.5 text-[11px] text-[#6B6B6B]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: seg.bg }} />
            {seg.label} — {pct(seg.label === 'Positive' ? positive : seg.label === 'Neutral' ? neutral : negative)}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Pain point item ──────────────────────────────────────────────
function PainPointRow({ cluster, max, index }: { cluster: ReviewCluster; max: number; index: number }) {
  const [open, setOpen] = useState(false)
  const pct = Math.round(((cluster.review_count ?? 0) / max) * 100)

  return (
    <div className="rounded-[12px] border border-[rgba(0,0,0,0.07)] overflow-hidden">
      <button
        className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-[#F8F9FB] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#0A0A0A] truncate">{cluster.topic_label}</p>
          <div className="mt-1.5 h-1 rounded-full overflow-hidden bg-[rgba(0,0,0,0.06)]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: '#EF4444' }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: index * 0.04, duration: 0.5 }}
            />
          </div>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: '#fee2e2', color: '#EF4444' }}
        >
          {cluster.review_count} reviews
        </span>
        <ChevronDown
          size={13}
          className="text-[#A3A3A3] flex-shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 space-y-2 border-t border-[rgba(0,0,0,0.05)]">
              {(cluster.sample_reviews ?? []).slice(0, 3).map((review, i) => (
                <blockquote
                  key={i}
                  className="border-l-4 border-[rgba(0,0,0,0.12)] pl-3 text-[12px] text-[#6B6B6B] italic leading-relaxed"
                >
                  {review}
                </blockquote>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main tab ─────────────────────────────────────────────────────
interface ConsumerIntelTabProps {
  clusters: ReviewCluster[]
  totalPositive?: number
  totalNeutral?: number
  totalNegative?: number
}

export function ConsumerIntelTab({
  clusters,
  totalPositive = 0,
  totalNeutral = 0,
  totalNegative = 0,
}: ConsumerIntelTabProps) {
  const painPoints      = clusters.filter(c => c.topic_type === 'pain_point')
  const featureRequests = clusters.filter(c => c.topic_type === 'feature_request')
  const praisePoints    = clusters.filter(c => c.topic_type === 'praise')

  const maxCount = Math.max(...clusters.map(c => c.review_count ?? 0), 1)

  // Bubble chart data
  const bubbleData = clusters.map(c => ({
    topic_id:    c.topic_id,
    topic_label: c.topic_label,
    topic_type:  c.topic_type,
    avg_sentiment: c.avg_sentiment ?? 0,
    review_count:  c.review_count ?? 1,
  }))

  return (
    <div className="space-y-6">
      {/* Sentiment bar */}
      {(totalPositive + totalNeutral + totalNegative) > 0 && (
        <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
          <h3 className="text-[14px] font-bold text-[#0A0A0A] mb-4">Sentiment breakdown</h3>
          <SentimentBar positive={totalPositive} neutral={totalNeutral} negative={totalNegative} />
        </div>
      )}

      {/* Bubble chart */}
      {bubbleData.length > 0 && (
        <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
          <h3 className="text-[14px] font-bold text-[#0A0A0A] mb-1">Topic clusters</h3>
          <p className="text-[12px] text-[#A3A3A3] mb-5">Bubble size = review volume · Y-axis = sentiment score</p>
          <ClusterBubbleChart data={bubbleData} height={260} />
        </div>
      )}

      {/* Pain points */}
      {painPoints.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-[0.1em] mb-3">
            Pain points
          </h3>
          {painPoints.map((c, i) => (
            <PainPointRow key={c.id} cluster={c} max={maxCount} index={i} />
          ))}
        </div>
      )}

      {/* Feature requests */}
      {featureRequests.length > 0 && (
        <div>
          <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-[0.1em] mb-3">
            Feature requests
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {featureRequests.map((c, i) => (
              <div
                key={c.id}
                className="bg-white rounded-[14px] p-4 border border-[rgba(0,0,0,0.07)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-semibold text-[#0A0A0A]">{c.topic_label}</p>
                  {i === 0 && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: '#0F0F0F', color: '#C8F04A' }}
                    >
                      Most wanted
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#A3A3A3] mt-1">
                  {c.review_count} requests
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Praise */}
      {praisePoints.length > 0 && (
        <div>
          <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-[0.1em] mb-3">
            What customers love
          </h3>
          <div className="flex flex-wrap gap-2">
            {praisePoints.map(c => (
              <span
                key={c.id}
                className="text-[12px] font-medium px-3 py-1 rounded-full border border-[rgba(0,0,0,0.07)] text-[#6B6B6B]"
                style={{ background: '#F8F9FB' }}
              >
                {c.topic_label}
                <span className="ml-2 text-[10px] text-[#A3A3A3]">{c.review_count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {clusters.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-[14px] font-semibold text-[#0A0A0A]">No consumer data yet</p>
          <p className="text-[12px] text-[#A3A3A3] mt-1 max-w-xs mx-auto">
            Review clustering data will appear once the report analysis is complete.
          </p>
        </div>
      )}
    </div>
  )
}
