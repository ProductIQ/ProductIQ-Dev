// src/pages/ReportViewPage.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowLeft, Download, FileText, Presentation,
  TrendingUp, TrendingDown, CheckCircle2,
  AlertTriangle, Copy, Check, BarChart3, Target,
  Brain, Loader2,
} from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs'
import { TrendVelocityChart } from '@/components/charts/TrendVelocityChart'
import { ConsumerIntelTab } from '@/components/report/ConsumerIntelTab'
import { useReport } from '@/hooks/useReport'
import type { Insight, Competitor, ProductConcept, ReviewCluster, GTMPlan } from '@/types/report'

// ── Helper components ─────────────────────────────────────────────
const INSIGHT_COLORS: Record<string, string> = {
  market_gap:           '#0F0F0F',
  consumer_need:        '#22C55E',
  competitive_advantage:'#0EA5E9',
  trend_opportunity:    '#F59E0B',
  risk:                 '#EF4444',
}

const INSIGHT_LABELS: Record<string, string> = {
  market_gap: 'Market Gap',
  consumer_need: 'Consumer Need',
  competitive_advantage: 'Competitive Edge',
  trend_opportunity: 'Trend Signal',
  risk: 'Risk Flag',
}

function InsightCard({ insight }: { insight: Insight }) {
  const [expanded, setExpanded] = useState(false)
  const color = INSIGHT_COLORS[insight.insight_type] ?? '#A3A3A3'
  const label = INSIGHT_LABELS[insight.insight_type] ?? insight.insight_type

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      className="cursor-pointer rounded-[16px] bg-white border border-[rgba(0,0,0,0.07)] overflow-hidden hover:border-[rgba(0,0,0,0.14)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200"
    >
      <div className="flex gap-0">
        {/* Left accent bar */}
        <div className="w-[3px] flex-shrink-0" style={{ background: color }} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <span
              className="text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{ color: color === '#0F0F0F' ? '#555' : color }}
            >
              {label}
            </span>
            <span className="text-[10px] font-mono text-[#C8C8C8] flex-shrink-0">
              {insight.confidence_score != null ? `${Math.round(insight.confidence_score * 100)}% confidence` : ''}
            </span>
          </div>
          <p className="text-[13.5px] font-semibold text-[#0A0A0A] leading-snug">{insight.title}</p>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="text-[12px] text-[#6B6B6B] leading-relaxed mt-2.5 border-t border-[rgba(0,0,0,0.05)] pt-2.5">{insight.body}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// Adapter type: maps real ProductConcept to the shape ConceptCard expects
interface ConceptDisplay {
  rank: number
  name: string
  tagline: string
  persona: string
  price: number
  validation: number
  usp: string
  gap: string
  features: string[]
  risks: string[]
  names: string[]
}

function adaptConcept(c: ProductConcept, index: number): ConceptDisplay {
  return {
    rank: index + 1,
    name: c.concept_name,
    tagline: c.tagline ?? '',
    persona: c.target_persona ?? '',
    price: c.suggested_price_inr ?? 0,
    validation: c.validation_score ?? 0,
    usp: c.usp ?? '',
    gap: c.gap_it_fills ?? '',
    features: c.key_features ?? [],
    risks: c.risks ?? [],
    names: c.name_ideas ?? [],
  }
}

function ConceptCard({ concept }: { concept: ConceptDisplay }) {
  const [copied, setCopied] = useState<string | null>(null)

  async function copyName(name: string) {
    await navigator.clipboard.writeText(name).catch(() => {})
    setCopied(name)
    setTimeout(() => setCopied(null), 1800)
  }

  const scoreColor = concept.validation > 70 ? '#22C55E' : concept.validation > 40 ? '#F59E0B' : '#EF4444'
  const arcLen = 2 * Math.PI * 24
  const offset = arcLen - (concept.validation / 100) * arcLen

  return (
    <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]">Concept {concept.rank}</span>
          <h3 className="text-[18px] font-bold text-[#0A0A0A] mt-0.5">{concept.name}</h3>
        </div>
        {/* SVG validation ring */}
        <div className="flex-shrink-0">
          <svg width={56} height={56} viewBox="0 0 56 56">
            <circle cx={28} cy={28} r={24} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={5} />
            <motion.circle
              cx={28} cy={28} r={24}
              fill="none"
              stroke={scoreColor}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={arcLen}
              initial={{ strokeDashoffset: arcLen }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              transform="rotate(-90 28 28)"
            />
            <text x={28} y={28} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight="bold" fill={scoreColor}>
              {concept.validation}
            </text>
          </svg>
        </div>
      </div>

      {/* Tagline */}
      <p className="text-[13px] text-[#6B6B6B] italic leading-relaxed border-l-4 border-[rgba(0,0,0,0.12)] pl-3 mb-4">
        {concept.tagline}
      </p>

      {/* Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { l: 'Target', v: concept.persona },
          { l: 'Price', v: `₹${concept.price.toLocaleString('en-IN')}` },
          { l: 'Score', v: `${concept.validation}/100` },
        ].map(p => (
          <span key={p.l} className="text-[11px] bg-[#F8F9FB] border border-[rgba(0,0,0,0.07)] text-[#6B6B6B] px-2.5 py-1 rounded-full">
            <span className="font-semibold text-[#A3A3A3]">{p.l}: </span>{p.v}
          </span>
        ))}
      </div>

      {/* USP + Gap grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">USP</p>
          <p className="text-[13px] text-[#444] leading-relaxed">{concept.usp}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Gap addressed</p>
          <p className="text-[13px] text-[#444] leading-relaxed">{concept.gap}</p>
        </div>
      </div>

      {/* Feature tags */}
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">Key features</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {concept.features.map(f => (
          <span key={f} className="text-[11px] bg-[#0F0F0F] text-[#C8F04A] px-2.5 py-0.5 rounded-full font-medium">{f}</span>
        ))}
      </div>

      {/* Risks */}
      <div className="bg-[#FFF8F8] rounded-xl p-3 mb-4 border border-[rgba(239,68,68,0.1)]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#EF4444] mb-2">Risks</p>
        {concept.risks.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-[12px] text-[#EF4444] mb-1 last:mb-0">
            <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" /> {r}
          </div>
        ))}
      </div>

      {/* Name ideas */}
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">Name ideas — click to copy</p>
      <div className="flex flex-wrap gap-1.5">
        {concept.names.map(n => (
          <button
            key={n}
            onClick={() => copyName(n)}
            className="text-[11px] bg-[#F8F9FB] border border-[rgba(0,0,0,0.1)] text-[#6B6B6B] px-2.5 py-0.5 rounded-full hover:bg-[#0F0F0F] hover:text-[#C8F04A] hover:border-transparent transition-all duration-150 flex items-center gap-1"
          >
            {copied === n ? <><Check size={9} className="text-[#22C55E]" /> Copied</> : n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Tab panels ─────────────────────────────────────────────────────
function OverviewTab({ insights, competitors, clusters }: {
  insights: Insight[]
  competitors: Competitor[]
  clusters: ReviewCluster[]
}) {
  const topInsight = insights.find(i => i.insight_type === 'market_gap') ?? insights[0]
  const totalReviews = clusters.reduce((sum, c) => sum + (c.review_count ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Products analysed', value: clusters.length ? String(clusters.length) : '—',     icon: BarChart3 },
          { label: 'Reviews mined',     value: totalReviews ? totalReviews.toLocaleString('en-IN') : '—',  icon: Brain },
          { label: 'Competitors mapped', value: competitors.length ? String(competitors.length) : '—',     icon: Target },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-[16px] p-5 border border-[rgba(0,0,0,0.07)] text-center">
              <Icon size={18} className="text-[#A3A3A3] mx-auto mb-2" />
              <div className="text-[26px] font-bold text-[#0A0A0A]">{s.value}</div>
              <div className="text-[12px] text-[#A3A3A3] mt-0.5">{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Top opportunity callout */}
      {topInsight && (
      <div className="rounded-[20px] p-6 text-white" style={{ background: '#0F0F0F' }}>
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 mb-2">Top Opportunity</p>
        <p className="text-[17px] font-bold text-white mb-2 leading-snug">{topInsight.title}</p>
        <p className="text-[13px] text-white/50 leading-relaxed">
          {topInsight.body}
        </p>
        <div
          className="mt-4 h-0.5 w-8 rounded-full"
          style={{ background: '#C8F04A' }}
        />
      </div>
      )}

      {/* Insights list */}
      <div>
        <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-[0.1em] mb-4">
          Agent Insights
        </h3>
        {insights.length === 0 ? (
          <div className="text-center py-10 text-[#A3A3A3] text-[13px]">
            No insights generated yet for this report.
          </div>
        ) : (
        <div className="space-y-2.5">
          {insights.map((insight, i) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
            >
              <InsightCard insight={insight} />
            </motion.div>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}

function CompetitorTab({ competitors }: { competitors: Competitor[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (competitors.length === 0) {
    return (
      <div className="text-center py-10 text-[#A3A3A3] text-[13px]">
        No competitor data available for this report yet.
      </div>
    )
  }

  // Compute price/rating ranges for positioning matrix
  const prices = competitors.map(c => c.price_inr ?? 0).filter(p => p > 0)
  const ratings = competitors.map(c => c.rating ?? 0).filter(r => r > 0)
  const minPrice = Math.min(...prices, 1)
  const maxPrice = Math.max(...prices, minPrice + 1)
  const minRating = Math.min(...ratings, 3)
  const maxRating = Math.max(...ratings, minRating + 0.5)

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.07)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F8F9FB] text-[11px] uppercase tracking-wider text-[#A3A3A3] border-b border-[rgba(0,0,0,0.05)]">
                <th className="px-6 py-3 font-semibold">Brand</th>
                <th className="px-6 py-3 font-semibold text-right">Price</th>
                <th className="px-6 py-3 font-semibold">Rating</th>
                <th className="px-6 py-3 font-semibold hidden md:table-cell">Strength</th>
                <th className="px-6 py-3 font-semibold hidden md:table-cell">Gap</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((comp, i) => (
                <>
                  <tr
                    key={comp.id}
                    onClick={() => setExpanded(expanded === comp.id ? null : comp.id)}
                    className="border-b border-[rgba(0,0,0,0.04)] cursor-pointer hover:bg-[#F8F9FB] transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <div className="text-[13px] font-semibold text-[#0A0A0A]">{comp.brand_name}</div>
                      <div className="text-[11px] text-[#A3A3A3]">{(comp.review_count ?? 0).toLocaleString()} reviews</div>
                    </td>
                    <td className="px-6 py-3.5 text-[13px] font-mono text-[#0A0A0A] text-right">₹{(comp.price_inr ?? 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-3.5 text-[13px] text-[#6B6B6B]">
                      ⭐ {comp.rating ?? '—'}
                    </td>
                    <td className="px-6 py-3.5 text-[12px] text-[#6B6B6B] hidden md:table-cell max-w-[160px]">{comp.key_strengths?.[0] ?? '—'}</td>
                    <td className="px-6 py-3.5 text-[12px] text-[#EF4444] hidden md:table-cell max-w-[160px]">{comp.key_weaknesses?.[0] ?? '—'}</td>
                  </tr>
                  <AnimatePresence>
                    {expanded === comp.id && (
                      <tr key={`${comp.id}-expanded`}>
                        <td colSpan={5} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 py-4 bg-[#F8F9FB] border-b border-[rgba(0,0,0,0.05)]">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Key Strengths</p>
                                  <p className="text-[13px] text-[#444]">{comp.key_strengths?.join(', ') || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#EF4444] mb-1.5">Exploitable Gaps</p>
                                  <p className="text-[13px] text-[#444]">{comp.key_weaknesses?.join(', ') || '—'}</p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Competitor positioning note */}
      <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
        <h3 className="text-[14px] font-bold text-[#0A0A0A] mb-3">Market Positioning Matrix</h3>
        <div className="relative h-48 border border-[rgba(0,0,0,0.07)] rounded-xl bg-[#F8F9FB] overflow-hidden">
          {/* Axes labels */}
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider">← Price Low / High →</span>
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateY(50%)' }}>← Rating Low / High →</span>
          {/* Plotted competitors */}
          {competitors.map(c => {
            const price = c.price_inr ?? 0
            const rating = c.rating ?? 0
            if (price === 0 || rating === 0) return null
            const leftPct = 15 + ((price - minPrice) / (maxPrice - minPrice)) * 70
            const topPct = 85 - ((rating - minRating) / (maxRating - minRating)) * 65
            return (
              <div
                key={c.id}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="w-3 h-3 rounded-full bg-[#0A0A0A] border-2 border-white shadow-sm" />
                <span className="text-[9px] font-semibold text-[#6B6B6B] mt-0.5 whitespace-nowrap">{c.brand_name.split(' ')[0]}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TrendsTab({ trends }: { trends: unknown[] }) {
  // Map real trend data to display format
  const trendCards = (trends as Array<{
    trend_keyword?: string
    velocity?: string
    trend_score?: number | null
    peak_predicted_at?: string | null
    detected_at?: string
  }>).map(t => ({
    keyword: t.trend_keyword ?? 'Unknown',
    velocity: t.velocity ?? 'stable',
    pct: t.trend_score != null ? `${t.trend_score > 0 ? '+' : ''}${t.trend_score}%` : '0%',
    peak: t.peak_predicted_at ? new Date(t.peak_predicted_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null,
  }))

  // Build chart data from trends (if available, otherwise empty)
  const chartKeys = trendCards.slice(0, 3).map(t => t.keyword)
  const chartData: Record<string, unknown>[] = []

  return (
    <div className="space-y-6">
      {/* Chart */}
      {chartData.length > 0 && chartKeys.length > 0 && (
      <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
        <h3 className="text-[14px] font-bold text-[#0A0A0A] mb-1">12-Month Trend Velocity</h3>
        <p className="text-[12px] text-[#A3A3A3] mb-5">Google Trends interest score (0–100) for top trend keywords</p>
        <TrendVelocityChart
          data={chartData}
          mode="trend"
          keys={chartKeys}
          height={220}
        />
      </div>
      )}

      {/* Trend cards */}
      <div>
        <h3 className="text-[13px] font-bold text-[#0A0A0A] uppercase tracking-wider mb-3">Detected Trend Signals</h3>
        {trendCards.length === 0 ? (
          <div className="text-center py-10 text-[#A3A3A3] text-[13px]">
            No trend signals detected yet for this report.
          </div>
        ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {trendCards.map((t, i) => (
            <motion.div
              key={t.keyword}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="bg-white rounded-[16px] p-4 border border-[rgba(0,0,0,0.07)]"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[13px] font-semibold text-[#0A0A0A]">{t.keyword}</p>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${
                  t.velocity === 'rising'   ? 'bg-[#dcfce7] text-[#16A34A]' :
                  t.velocity === 'declining'? 'bg-[#fee2e2] text-[#EF4444]' :
                  'bg-[rgba(0,0,0,0.07)] text-[#A3A3A3]'
                }`}>{t.velocity}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[12px]" style={{ color: t.pct.startsWith('+') ? '#16A34A' : '#EF4444' }}>
                  {t.pct.startsWith('+') ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span className="font-semibold">{t.pct} YoY</span>
                </div>
                {t.peak && (
                  <span className="text-[11px] text-[#A3A3A3]">Peak est. {t.peak}</span>
                )}
              </div>
              {t.velocity === 'rising' && (
                <div className="mt-2">
                  <span className="text-[10px] font-bold bg-[#dcfce7] text-[#16A34A] px-2 py-0.5 rounded-full">
                    Competitors not acting yet
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}

function ConceptsTab({ concepts }: { concepts: ProductConcept[] }) {
  if (concepts.length === 0) {
    return (
      <div className="text-center py-10 text-[#A3A3A3] text-[13px]">
        No product concepts generated yet for this report.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {concepts.map((concept, i) => (
        <motion.div
          key={concept.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 * i }}
        >
          <ConceptCard concept={adaptConcept(concept, i)} />
        </motion.div>
      ))}
    </div>
  )
}

function GTMTab({ gtmPlans }: { gtmPlans: GTMPlan[] }) {
  // Extract channels from real GTM plan data
  const plan = gtmPlans[0]
  const channels = (plan?.launch_channels ?? []) as string[]
  const timeline = (plan?.launch_timeline ?? {}) as Record<string, unknown>
  const budget = (plan?.budget_estimate ?? {}) as Record<string, unknown>

  // Default timeline phases (used when no real timeline data)
  const defaultTimeline = [
    { week: 'Week 1–2',  phase: 'Foundation',  color: '#C8F04A', items: ['Finalise FSSAI claim list', 'Lock flavour formula', 'Brief creative agency'] },
    { week: 'Week 3–4',  phase: 'Pre-launch',  color: '#F59E0B', items: ['Amazon listing optimization + A+ content', 'Seed 10 micro-influencers (gifting)', 'Meesho catalogue setup'] },
    { week: 'Week 5–8',  phase: 'Launch',      color: '#22C55E', items: ['Amazon PPC campaign go-live (₹50K budget)', 'Influencer posts go live', 'Reddit organic seeding'] },
    { week: 'Week 9–12', phase: 'Optimise',    color: '#0EA5E9', items: ['Review ACOS and pause underperforming ad groups', 'Expand to 3 new influencers based on results', 'Begin Flipkart listing'] },
  ]

  // Try to extract timeline phases from real data, fall back to defaults
  const timelinePhases = Array.isArray(timeline.phases) ? timeline.phases : defaultTimeline

  if (gtmPlans.length === 0) {
    return (
      <div className="text-center py-10 text-[#A3A3A3] text-[13px]">
        No GTM plan generated yet for this report.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Launch channels */}
      {channels.length > 0 && (
      <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
          <h3 className="text-[14px] font-bold text-[#0A0A0A]">Recommended Launch Channels</h3>
        </div>
        {channels.map((ch, i) => (
          <div key={i} className={`flex items-start gap-4 px-6 py-4 ${i < channels.length - 1 ? 'border-b border-[rgba(0,0,0,0.04)]' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-[#0F0F0F] text-[#C8F04A] flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#0A0A0A]">{ch}</p>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* 90-day timeline */}
      <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
        <h3 className="text-[14px] font-bold text-[#0A0A0A] mb-5">90-Day Launch Timeline</h3>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-[rgba(0,0,0,0.08)]" />
          <div className="space-y-6">
            {timelinePhases.map((phase: any, i: number) => {
              const colors = ['#C8F04A', '#F59E0B', '#22C55E', '#0EA5E9']
              const color = phase.color ?? colors[i % colors.length]
              const week = phase.week ?? `Phase ${i + 1}`
              const phaseName = phase.phase ?? phase.name ?? ''
              const items = phase.items ?? phase.tasks ?? []
              return (
              <div key={week} className="flex gap-5 pl-10 relative">
                <div
                  className="absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 border-white -translate-x-1/2 flex-shrink-0"
                  style={{ background: color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]">{week}</span>
                    {phaseName && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: color + '28', color: color }}>
                      {phaseName}
                    </span>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {items.map((item: string) => (
                      <li key={item} className="flex items-center gap-2 text-[13px] text-[#444]">
                        <CheckCircle2 size={11} style={{ color }} className="flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Budget overview */}
      {budget && Object.keys(budget).length > 0 && (
      <div className="rounded-[20px] p-6 text-white" style={{ background: '#0F0F0F' }}>
        <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2">
          <Target size={13} className="text-[#C8F04A]" /> 90-Day Budget Estimate
        </h3>
        <div className="border-t border-white/10 mt-5 pt-4 flex items-center justify-between">
          <span className="text-[13px] text-white/60">Total 90-day budget</span>
          <span className="text-[20px] font-bold text-[#C8F04A]">{String(budget.total ?? '—')}</span>
        </div>
      </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
const REPORT_TABS = [
  { id: 'overview',   label: 'Overview'        },
  { id: 'consumer',  label: 'Consumer Intel'   },
  { id: 'competitors', label: 'Competitors'    },
  { id: 'trends',    label: 'Trends'           },
  { id: 'concepts',  label: 'Concepts'         },
  { id: 'gtm',       label: 'GTM Plan'         },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}m ${sec}s`
}

export function ReportViewPage() {
  const { runId } = useParams()
  const navigate = useNavigate()

  // Fetch real report data from the backend
  const { data: reportData, isLoading } = useReport(runId)
  const run = reportData?.run ?? null
  const report = reportData?.report ?? null
  const insights = reportData?.insights ?? []
  const clusters = reportData?.clusters ?? []
  const competitors = reportData?.competitors ?? []
  const trends = reportData?.trends ?? []
  const concepts = reportData?.concepts ?? []
  const gtmPlans = reportData?.gtmPlans ?? []

  // Compute consumer intel summary from clusters
  const totalPositive = clusters.filter(c => c.avg_sentiment != null && c.avg_sentiment > 0.3).reduce((s, c) => s + (c.review_count ?? 0), 0)
  const totalNegative = clusters.filter(c => c.avg_sentiment != null && c.avg_sentiment < -0.3).reduce((s, c) => s + (c.review_count ?? 0), 0)
  const totalNeutral = clusters.filter(c => c.avg_sentiment != null && c.avg_sentiment >= -0.3 && c.avg_sentiment <= 0.3).reduce((s, c) => s + (c.review_count ?? 0), 0)

  return (
    <div className="max-w-[1080px] mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-[12px] font-medium text-[#A3A3A3] hover:text-[#0A0A0A] mb-4 transition-colors"
        >
          <ArrowLeft size={13} /> Back to dashboard
        </button>

        {isLoading ? (
          <div className="h-[120px] animate-pulse bg-[#F5F5F4] rounded-[16px]" />
        ) : !run ? (
          <div className="text-center py-12">
            <p className="text-[15px] text-[#A3A3A3]">Report not found or still loading.</p>
          </div>
        ) : (
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono bg-[#0F0F0F] text-[#C8F04A] px-2 py-0.5 rounded uppercase tracking-wider">
                Report Complete
              </span>
            </div>
            <h1 className="text-[26px] font-bold tracking-tight text-[#0A0A0A]">
              {run.product_category} Intelligence
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[12px] text-[#A3A3A3]">
              <span>Market: {run.target_market ?? 'India'}</span>
              {run.brand_name && <span>· Brand: {run.brand_name}</span>}
              <span>· Generated {formatDate(run.created_at)}</span>
              {run.duration_seconds && <span>· Duration: {formatDuration(run.duration_seconds)}</span>}
            </div>
          </motion.div>

          {/* Download buttons */}
          <motion.div
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <a
              href={report?.pdf_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn-outline btn-sm flex items-center gap-1.5 ${!report?.pdf_url ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <FileText size={13} /> PDF
            </a>
            <a
              href={report?.pptx_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn-outline btn-sm flex items-center gap-1.5 ${!report?.pptx_url ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <Presentation size={13} /> PPT
            </a>
            <button className="btn btn-black btn-sm flex items-center gap-1.5">
              <Download size={13} /> Export all
            </button>
          </motion.div>
        </div>
        )}
      </div>

      {/* ── Tabs ── */}
      {!isLoading && run && (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Tabs tabs={REPORT_TABS}>
          {(activeTab) => (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview'    && <OverviewTab insights={insights} competitors={competitors} clusters={clusters} />}
              {activeTab === 'consumer'    && (
                <ConsumerIntelTab
                  clusters={clusters}
                  totalPositive={totalPositive}
                  totalNeutral={totalNeutral}
                  totalNegative={totalNegative}
                />
              )}
              {activeTab === 'competitors' && <CompetitorTab competitors={competitors} />}
              {activeTab === 'trends'      && <TrendsTab trends={trends} />}
              {activeTab === 'concepts'    && <ConceptsTab concepts={concepts} />}
              {activeTab === 'gtm'         && <GTMTab gtmPlans={gtmPlans} />}
            </motion.div>
          )}
        </Tabs>
      </motion.div>
      )}
    </div>
  )
}
