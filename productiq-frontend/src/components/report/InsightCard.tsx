// src/components/report/InsightCard.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

export interface Insight {
  id: string
  insight_type: string
  title: string
  body: string
  confidence_score: number
  sources?: Record<string, unknown> | null
}

const TYPE_CONFIG: Record<string, { label: string; color: string; displayColor: string }> = {
  market_gap:            { label: 'Market Gap',       color: '#0F0F0F', displayColor: '#555555' },
  consumer_need:         { label: 'Consumer Need',    color: '#22C55E', displayColor: '#22C55E' },
  competitive_advantage: { label: 'Competitive Edge', color: '#0EA5E9', displayColor: '#0EA5E9' },
  trend_opportunity:     { label: 'Trend Signal',     color: '#F59E0B', displayColor: '#F59E0B' },
  risk:                  { label: 'Risk Flag',        color: '#EF4444', displayColor: '#EF4444' },
}

interface InsightCardProps {
  insight: Insight
  index?: number
}

export function InsightCard({ insight, index = 0 }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false)
  const cfg = TYPE_CONFIG[insight.insight_type] ?? { label: insight.insight_type, color: '#A3A3A3', displayColor: '#A3A3A3' }
  const confPct = Math.round((insight.confidence_score ?? 0) * 100)
  const confColor = confPct >= 70 ? '#22C55E' : confPct >= 40 ? '#F59E0B' : '#EF4444'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      onClick={() => setExpanded(e => !e)}
      className={cn(
        'cursor-pointer rounded-[16px] bg-white border overflow-hidden',
        'hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] transition-all duration-200',
        expanded ? 'border-[rgba(0,0,0,0.14)]' : 'border-[rgba(0,0,0,0.07)]',
      )}
    >
      <div className="flex gap-0">
        {/* Left accent bar */}
        <div className="w-[3px] flex-shrink-0" style={{ background: cfg.color }} />

        <div className="flex-1 p-4">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <span
              className="text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{ color: cfg.displayColor }}
            >
              {cfg.label}
            </span>
            <span className="text-[10px] font-mono text-[#C8C8C8] flex-shrink-0">
              {confPct}% confidence
            </span>
          </div>

          {/* Title */}
          <p className="text-[13.5px] font-semibold text-[#0A0A0A] leading-snug">
            {insight.title}
          </p>

          {/* Confidence bar */}
          <div className="mt-2.5 h-0.5 rounded-full overflow-hidden bg-[rgba(0,0,0,0.07)]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: confColor }}
              initial={{ width: 0 }}
              animate={{ width: `${confPct}%` }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
            />
          </div>

          {/* Expandable body */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <p className="text-[12px] text-[#6B6B6B] leading-relaxed mt-3 pt-3 border-t border-[rgba(0,0,0,0.05)]">
                  {insight.body}
                </p>
                {insight.sources && Object.keys(insight.sources).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.keys(insight.sources).map(src => (
                      <span
                        key={src}
                        className="text-[10px] italic text-[#A3A3A3] bg-[#F8F9FB] px-2 py-0.5 rounded-full"
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
