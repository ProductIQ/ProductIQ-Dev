// src/pages/SentimentPage.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import {
  TrendingUp, TrendingDown, AlertCircle, Activity,
  ShoppingBag, MessageSquare, MessageCircle, Bell, ArrowUpRight, Minus,
  Loader2,
} from 'lucide-react'
import { SentimentGauge } from '@/components/charts/SentimentGauge'
import { TrendVelocityChart } from '@/components/charts/TrendVelocityChart'
import { getSentimentHistory } from '@/lib/api'
import { timeAgo } from '@/lib/mockData'
import type { SentimentScore } from '@/hooks/useRealtimeSentiment'

// The backend sentiment_scores table includes an alert_sent flag that the
// shared SentimentScore type doesn't model, so we extend it locally.
type SentimentScoreRow = SentimentScore & { alert_sent?: boolean }

// ── Static Configuration ─────────────────────────────────────────
// Platform list is display configuration (names + icons). Scores here
// are placeholder demo values; real per-platform breakdown is not yet
// exposed by the API.
const PLATFORMS = [
  { id: 'amazon',  label: 'Amazon',  icon: ShoppingBag,    score: 0.62, count: 1842, delta: +0.08 },
  { id: 'reddit',  label: 'Reddit',  icon: MessageSquare,  score: 0.44, count: 312, delta: -0.05 },
  { id: 'twitter', label: 'X/Twitter', icon: MessageCircle, score: 0.55, count: 987, delta: +0.12 },
]

const KEYWORDS_POS = [
  { word: 'mixes well',     count: 834, trend: '+12%', up: true },
  { word: 'great taste',    count: 642, trend: '+8%',  up: true },
  { word: 'no bloating',    count: 410, trend: '+24%', up: true },
  { word: 'fast shipping',  count: 298, trend: '+2%',  up: true },
]

const KEYWORDS_NEG = [
  { word: 'too sweet',  count: 312, trend: '-4%',  up: false },
  { word: 'chalky',     count: 189, trend: '-11%', up: false },
  { word: 'expensive',  count: 145, trend: '+5%',  up: true },
]

function sentimentColor(score: number) {
  if (score > 0.6) return '#16A34A'
  if (score > 0.2) return '#22C55E'
  if (score > -0.2) return '#A3A3A3'
  if (score > -0.6) return '#F97316'
  return '#EF4444'
}

// ── Component ─────────────────────────────────────────────────────
export function SentimentPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)

  // ── Fetch real sentiment history from the API ──
  // getSentimentHistory returns { scores: SentimentScore[], total: number }
  // Backend returns scores ordered newest-first; we reverse for chronology.
  const { data, isLoading } = useQuery<{ scores: SentimentScoreRow[]; total: number }>({
    queryKey: ['sentiment-history'],
    queryFn: () => getSentimentHistory(),
  })

  const rawScores: SentimentScoreRow[] = data?.scores ?? []
  // Chronological order (oldest → newest) for the trend chart
  const scoreHistory = [...rawScores].reverse()
  const isConnected = !isLoading && rawScores.length > 0

  // Current overall score (average last 3 readings)
  const recentScores = scoreHistory.slice(-3)
  const currentScore = recentScores.length
    ? recentScores.reduce((a, s) => a + s.score, 0) / recentScores.length
    : 0

  // 7-day avg delta
  const prevWindow = scoreHistory.slice(-10, -3)
  const week7Avg = prevWindow.length
    ? prevWindow.reduce((a, s) => a + s.score, 0) / prevWindow.length
    : 0
  const delta = currentScore - week7Avg

  // Chart data for 30-day trend
  const chartData = scoreHistory.map(s => ({
    date: s.scored_at,
    score: parseFloat(s.score.toFixed(3)),
  }))

  // Latest reading drives the aggregate stats strip
  const latest = scoreHistory[scoreHistory.length - 1] ?? null
  const totalMentions = scoreHistory.reduce((a, s) => a + (s.post_count ?? 0), 0)

  // Real alerts: derive from scores flagged by the backend (alert_sent)
  const alerts = rawScores
    .filter(s => s.alert_sent)
    .map(s => ({
      date: new Date(s.scored_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      }),
      message: `Sentiment alert for ${s.brand_name} — score ${s.score >= 0 ? '+' : ''}${s.score.toFixed(2)} across ${s.platform ?? 'all platforms'}`,
      type: s.score < 0 ? 'drop' : 'spike',
    }))

  const updatedAgo = latest ? timeAgo(latest.scored_at) : '—'

  const PlatformIcon = {
    amazon: ShoppingBag,
    reddit: MessageSquare,
    twitter: MessageCircle,
  } as Record<string, any>

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="max-w-[1080px] mx-auto pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono bg-[#0F0F0F] text-[#C8F04A] px-2 py-0.5 rounded uppercase tracking-wider">Agent 09</span>
              <span className="text-[12px] font-semibold tracking-[0.1em] uppercase text-[#A3A3A3]">Brand Health Monitor</span>
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">
              Sentiment Tracker
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-[#A3A3A3]">
          <Loader2 size={28} className="animate-spin mb-3" />
          <p className="text-[13px]">Loading sentiment data…</p>
        </div>
      </div>
    )
  }

  // ── Empty state ──
  if (!rawScores.length) {
    return (
      <div className="max-w-[1080px] mx-auto pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono bg-[#0F0F0F] text-[#C8F04A] px-2 py-0.5 rounded uppercase tracking-wider">Agent 09</span>
              <span className="text-[12px] font-semibold tracking-[0.1em] uppercase text-[#A3A3A3]">Brand Health Monitor</span>
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">
              Sentiment Tracker
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Activity size={32} className="text-[#A3A3A3] mb-4" />
          <p className="text-[14px] text-[#0A0A0A] font-medium mb-1">No sentiment data yet</p>
          <p className="text-[13px] text-[#A3A3A3] max-w-md">
            Sentiment tracking starts when you add a brand and run a report.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1080px] mx-auto pb-12">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono bg-[#0F0F0F] text-[#C8F04A] px-2 py-0.5 rounded uppercase tracking-wider">Agent 09</span>
            <span className="text-[12px] font-semibold tracking-[0.1em] uppercase text-[#A3A3A3]">Brand Health Monitor</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">
            Sentiment Tracker
          </h1>
        </motion.div>

        {/* Live indicator */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-[13px] text-[#A3A3A3]"
        >
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#22C55E] animate-pulse' : 'bg-[#A3A3A3]'}`} />
          {isConnected ? 'Live ' : 'Polling · '}
          <span className="text-[11px]">Updated {updatedAgo}</span>
        </motion.div>
      </div>

      {/* ── Score Hero + Platform Breakdown ── */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">

        {/* Score Gauge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="lg:col-span-1 bg-white rounded-[20px] p-6 flex flex-col items-center justify-center border border-[rgba(0,0,0,0.07)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3] mb-4">Overall Brand Score</p>
          <SentimentGauge score={currentScore} size="large" />
          <div className="flex items-center gap-1.5 mt-4 text-[13px]" style={{ color: delta >= 0 ? '#22C55E' : '#EF4444' }}>
            {delta >= 0
              ? <TrendingUp size={14} />
              : <TrendingDown size={14} />}
            <span className="font-semibold">{delta >= 0 ? '+' : ''}{delta.toFixed(2)} vs 7-day avg</span>
          </div>
        </motion.div>

        {/* Platform Breakdown */}
        <div className="lg:col-span-2 grid sm:grid-cols-3 gap-4">
          {PLATFORMS.map((p, i) => {
            const Icon = p.icon
            const color = sentimentColor(p.score)
            const isSelected = selectedPlatform === p.id
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.06 }}
                onClick={() => setSelectedPlatform(isSelected ? null : p.id)}
                className={`bg-white rounded-[20px] p-5 border cursor-pointer transition-all duration-150 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] ${
                  isSelected
                    ? 'border-[#0A0A0A] shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                    : 'border-[rgba(0,0,0,0.07)]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-[#A3A3A3]" />
                    <span className="text-[12px] font-semibold text-[#6B6B6B]">{p.label}</span>
                  </div>
                  <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${p.delta >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {p.delta >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {p.delta >= 0 ? '+' : ''}{p.delta.toFixed(2)}
                  </span>
                </div>
                <div className="text-[28px] font-black tracking-tight" style={{ color }}>
                  {p.score >= 0 ? '+' : ''}{p.score.toFixed(2)}
                </div>
                <div className="text-[11px] text-[#A3A3A3] mt-1">{p.count.toLocaleString('en-IN')} mentions</div>
              </motion.div>
            )
          })}

          {/* Aggregate stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
            className="sm:col-span-3 bg-[#0F0F0F] rounded-[20px] p-5 text-white flex items-center justify-between gap-6"
          >
            {[
              { label: 'Positive reviews', value: `${latest?.positive_pct ?? 0}%`, color: '#C8F04A' },
              { label: 'Neutral',           value: `${latest?.neutral_pct ?? 0}%`, color: '#A3A3A3' },
              { label: 'Negative',          value: `${latest?.negative_pct ?? 0}%`, color: '#EF4444' },
              { label: 'Total mentions',    value: totalMentions.toLocaleString('en-IN'), color: '#fff' },
            ].map((stat) => (
              <div key={stat.label} className="text-center flex-1">
                <div className="text-[22px] font-black" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[11px] text-white/50 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── 30-Day Trend Chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)] mb-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[14px] font-bold text-[#0A0A0A]">30-Day Sentiment Trend</h3>
            <p className="text-[12px] text-[#A3A3A3] mt-0.5">Daily aggregate score across all platforms</p>
          </div>
          <span className="text-[11px] font-mono bg-[#F8F9FB] text-[#A3A3A3] border border-[rgba(0,0,0,0.06)] px-2 py-1 rounded">
            {selectedPlatform ?? 'All Platforms'}
          </span>
        </div>
        <TrendVelocityChart data={chartData} mode="sentiment" height={200} />
      </motion.div>

      {/* ── Keywords Grid ── */}
      <div className="grid sm:grid-cols-2 gap-6 mb-6">
        {/* Positive drivers */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]"
        >
          <h3 className="text-[13px] font-bold text-[#0A0A0A] uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp size={13} className="text-[#22C55E]" /> Positive Drivers
          </h3>
          <div className="space-y-3">
            {KEYWORDS_POS.map((k, i) => (
              <div key={k.word} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#A3A3A3]">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[13px] font-medium text-[#0A0A0A]">"{k.word}"</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-[#A3A3A3]">{k.count.toLocaleString()}</span>
                  <span className="text-[11px] font-semibold text-[#22C55E] w-10 text-right">{k.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Negative drivers */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]"
        >
          <h3 className="text-[13px] font-bold text-[#0A0A0A] uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingDown size={13} className="text-[#EF4444]" /> Negative Drivers
          </h3>
          <div className="space-y-3">
            {KEYWORDS_NEG.map((k, i) => (
              <div key={k.word} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#A3A3A3]">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[13px] font-medium text-[#0A0A0A]">"{k.word}"</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-[#A3A3A3]">{k.count.toLocaleString()}</span>
                  <span className={`text-[11px] font-semibold w-10 text-right ${k.up ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {k.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Anomaly + Alert History ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Anomaly card */}
        <motion.div
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.32 }}
          className="rounded-[20px] p-6 text-white col-span-1 relative overflow-hidden" style={{ background: '#0F0F0F' }}
        >
          <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2">
            <AlertCircle size={14} className="text-[#C8F04A]" /> Emerging Anomaly
          </h3>
          <p className="text-[13px] leading-[1.65] text-white/80 mb-5">
            A highly upvoted thread in <strong className="text-white">r/IndianSkincareAddicts</strong> is questioning your brand's preservative profile, with 312 upvotes in 24 hours.
          </p>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-5">
            <p className="text-[12px] text-white/50 italic leading-relaxed">
              "…love the texture but has anyone noticed phenoxyethanol is the 3rd ingredient? That feels way too high."
            </p>
          </div>
          <button className="btn btn-lime btn-sm w-full flex items-center justify-center gap-1">
            View Thread <ArrowUpRight size={12} />
          </button>
          <Activity size={100} className="absolute -bottom-8 -right-8 text-white/[0.04]" />
        </motion.div>

        {/* Alert History */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)] lg:col-span-2"
        >
          <h3 className="text-[14px] font-bold text-[#0A0A0A] mb-5 flex items-center gap-2">
            <Bell size={14} className="text-[#A3A3A3]" /> Alert History
          </h3>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell size={20} className="text-[#A3A3A3] mb-3" />
                <p className="text-[13px] text-[#0A0A0A] font-medium mb-1">No alerts yet</p>
                <p className="text-[12px] text-[#A3A3A3] max-w-xs">
                  You'll be notified here when your brand sentiment drops or spikes unexpectedly.
                </p>
              </div>
            ) : (
              <>
                {alerts.map((alert, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.38 + i * 0.05 }}
                    className="flex items-start justify-between gap-4 bg-[#FEF2F2] rounded-xl p-4 border border-[rgba(239,68,68,0.1)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-[13px] font-medium text-[#0A0A0A]">{alert.message}</p>
                        <p className="text-[11px] text-[#A3A3A3] mt-0.5">{alert.date}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-[#EF4444] text-white px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0">
                      Alert
                    </span>
                  </motion.div>
                ))}
                <p className="text-[12px] text-[#A3A3A3] text-center mt-2">
                  Showing last {alerts.length} alert{alerts.length === 1 ? '' : 's'} · <button className="text-[#0A0A0A] underline underline-offset-2 font-medium">View all</button>
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
