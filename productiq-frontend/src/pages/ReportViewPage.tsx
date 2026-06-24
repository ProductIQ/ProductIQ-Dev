// src/pages/ReportViewPage.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowLeft, Download, FileText, Presentation,
  TrendingUp, TrendingDown, CheckCircle2,
  AlertTriangle, Copy, Check, BarChart3, Target,
  Brain,
} from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs'
import { TrendVelocityChart } from '@/components/charts/TrendVelocityChart'
import { ConsumerIntelTab } from '@/components/report/ConsumerIntelTab'

// ── Mock report data ───────────────────────────────────────────────
const MOCK_RUN = {
  id: 'mock-run-001',
  product_category: 'Whey Protein',
  brand_name: 'YourBrand',
  target_market: 'India',
  status: 'completed',
  created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  duration_seconds: 612,
}

const MOCK_INSIGHTS = [
  { id: '1', insight_type: 'market_gap',             confidence_score: 0.87, title: 'Sugar-free segment is massively underserved', body: 'Only 2 of 18 tracked SKUs offer a certified sugar-free formulation. 34% of negative reviews across the category mention sweetness as a pain point, yet brand positioning hasn\'t responded.' },
  { id: '2', insight_type: 'consumer_need',           confidence_score: 0.81, title: 'Digestibility is the #1 purchase driver post-trial', body: '62% of 3-star reviews that eventually converted to 5-star after a second purchase cited "stomach adjusted after a week." An onboarding guide addressing this could directly improve retention.' },
  { id: '3', insight_type: 'competitive_advantage',  confidence_score: 0.74, title: 'Transparent ingredient sourcing is a whitespace', body: 'No top-10 brand in the category displays third-party lab results on their product page. A verified QR code linked to lab reports could create meaningful brand differentiation.' },
  { id: '4', insight_type: 'trend_opportunity',       confidence_score: 0.69, title: 'Collagen-protein blends trending +180% on Google', body: 'Cross-category interest in beauty-from-within supplements is surging. A collagen + whey hybrid SKU could capture both the fitness and beauty audiences with one product.' },
  { id: '5', insight_type: 'risk',                    confidence_score: 0.78, title: 'Regulatory risk: FSSAI label compliance gap', body: 'Agent 12 flagged that 3 of your planned claims ("boosts immunity," "promotes fat loss") require substantiated clinical evidence under FSSAI\'s draft nutrient content claims regulation.' },
]

const MOCK_COMPETITORS = [
  { name: 'MuscleBlaze Biozyme',  price: 2499, rating: 4.3, reviews: 14200, strength: 'Patented enzyme blend',    gap: 'No transparent lab reports' },
  { name: 'Optimum Nutrition Gold', price: 4299, rating: 4.6, reviews: 9800, strength: 'Global brand trust',      gap: 'Premium-only pricing locks out Tier 2' },
  { name: 'MyProtein Impact',     price: 1799, rating: 4.0, reviews: 7200,  strength: 'Price leadership',         gap: 'Weak India-specific positioning' },
  { name: 'Nakpro Performance',   price: 1499, rating: 3.8, reviews: 2400,  strength: 'Budget entry point',       gap: 'Taste scores consistently low' },
  { name: 'HK Vitals Whey',       price: 1299, rating: 3.7, reviews: 4100,  strength: 'Health influencer backing', gap: 'Limited SKU depth' },
]

const MOCK_TRENDS_CHART_KEYS = ['whey protein', 'plant protein', 'collagen protein']
const MOCK_TRENDS_DATA = Array.from({ length: 12 }, (_, i) => ({
  date: new Date(Date.now() - (11 - i) * 30 * 86400000).toISOString(),
  'whey protein':    60 + Math.round(Math.sin(i * 0.7) * 18),
  'plant protein':   30 + Math.round(i * 2.5 + Math.sin(i * 0.4) * 8),
  'collagen protein': 10 + Math.round(i * 4 + Math.sin(i * 1.1) * 6),
}))

const MOCK_TREND_CARDS = [
  { keyword: 'Collagen protein blend',   velocity: 'rising',   peak: 'Sep 2026',  pct: '+180%' },
  { keyword: 'Sugar-free whey',          velocity: 'rising',   peak: 'Jul 2026',  pct: '+124%' },
  { keyword: 'Vegan protein India',      velocity: 'rising',   peak: 'Jun 2026',  pct: '+89%' },
  { keyword: 'Whey concentrate 80%',     velocity: 'stable',   peak: null,         pct: '+12%' },
  { keyword: 'Mass gainer students',     velocity: 'declining', peak: null,        pct: '-18%' },
  { keyword: 'Whey isolate women',       velocity: 'rising',   peak: 'Aug 2026',  pct: '+67%' },
]

const MOCK_CONCEPTS = [
  {
    rank: 1,
    name: 'ClearWhey Sugar-Free',
    tagline: '"The first whey protein your dietitian will approve."',
    persona: '25–40, health-conscious working professionals',
    price: 2299,
    validation: 83,
    usp: 'Zero added sugar, third-party lab tested, FSSAI compliant, transparent QR code on every pack.',
    gap: 'The sugar-free certified protein segment is 0% of top-10 SKUs despite 34% of reviews citing sweetness as a pain point.',
    features: ['Certified zero sugar', 'Lab QR code on pack', 'FSSAI compliant claims', '28g protein per scoop', 'Digestive enzyme blend'],
    risks: ['Sugar-free claims require FSSAI certification, 8–12 week lead time', 'Premium pricing may limit Tier 2 adoption'],
    names: ['ClearWhey', 'PureForm', 'ZeroSweet Protein', 'Verified Whey'],
  },
  {
    rank: 2,
    name: 'CollaWhey Glow+',
    tagline: '"Protein that works from your muscles to your skin."',
    persona: '22–35, fitness + beauty conscious women',
    price: 2799,
    validation: 71,
    usp: 'Whey protein + marine collagen blend targeting both fitness and beauty-from-within trends simultaneously.',
    gap: 'No brand has bridged the fitness + beauty segments in protein. Google Trends shows +180% for "collagen protein" YoY.',
    features: ['25g whey + 5g marine collagen', 'Biotin + Vitamin C co-factors', 'Rose water flavour', 'Recyclable packaging'],
    risks: ['Marine collagen import cost increases margins', 'Beauty claims require different regulatory pathway'],
    names: ['CollaWhey', 'GlowProtein', 'FitGlow', 'SkinFuel'],
  },
  {
    rank: 3,
    name: 'StudyGains Student Pack',
    tagline: '"More protein, less spend. Made for hostels."',
    persona: '18–24, college students, Tier 2 India',
    price: 899,
    validation: 58,
    usp: 'Single-serving sachets at ₹29/serving targeting price-sensitive student segment, sold via college canteens and Meesho.',
    gap: 'Budget segment has no D2C brand with quality positioning. Student review sentiment shows willingness to pay slightly more for trustworthy brand.',
    features: ['Single-serve sachets 30g', '22g protein per sachet', 'Meesho + Zepto distribution', 'Hostel-friendly no-shaker mix'],
    risks: ['Low margin per unit — requires volume', 'Distribution in Tier 2 colleges is operationally complex'],
    names: ['StudyGains', 'HostelWhey', 'CampusFuel', 'NutriBag'],
  },
]

const GTM_CHANNELS = [
  { rank: 1, channel: 'Amazon PPC (Sponsored Products)', roi: 'Highest',  reason: '14,200 reviews on #1 competitor — capture existing demand directly' },
  { rank: 2, channel: 'Health/fitness micro-influencers (50K–200K)',  roi: 'High',    reason: '47% of purchase decisions attributed to influencer recommendations in category' },
  { rank: 3, channel: 'Meesho social commerce',   roi: 'High',    reason: 'Fastest-growing protein channel in Tier 2 cities; low competition from established brands' },
  { rank: 4, channel: 'Reddit r/fitness + r/IndianFoodHacks', roi: 'Medium', reason: '312 organic brand mentions found; community is brand-discovery-ready' },
  { rank: 5, channel: 'Google Search (non-brand)',  roi: 'Medium',  reason: '"Sugar-free protein India" has 8,100 monthly searches with zero ads from competitors' },
]

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

function InsightCard({ insight }: { insight: typeof MOCK_INSIGHTS[0] }) {
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
              {Math.round(insight.confidence_score * 100)}% confidence
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

function ConceptCard({ concept }: { concept: typeof MOCK_CONCEPTS[0] }) {
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
function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Products analysed', value: '847',     icon: BarChart3 },
          { label: 'Reviews mined',     value: '12,340',  icon: Brain },
          { label: 'Competitors mapped', value: '18',     icon: Target },
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
      <div className="rounded-[20px] p-6 text-white" style={{ background: '#0F0F0F' }}>
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 mb-2">Top Opportunity</p>
        <p className="text-[17px] font-bold text-white mb-2 leading-snug">Sugar-free certified whey is a ₹80+ crore untapped gap</p>
        <p className="text-[13px] text-white/50 leading-relaxed">
          34% of negative reviews mention sweetness, 0 of top-10 SKUs are certified sugar-free, and #1 search intent phrase has no sponsored ads from competitors.
        </p>
        <div
          className="mt-4 h-0.5 w-8 rounded-full"
          style={{ background: '#C8F04A' }}
        />
      </div>

      {/* Insights list */}
      <div>
        <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-[0.1em] mb-4">
          Agent Insights
        </h3>
        <div className="space-y-2.5">
          {MOCK_INSIGHTS.map((insight, i) => (
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
      </div>
    </div>
  )
}

function CompetitorTab() {
  const [expanded, setExpanded] = useState<string | null>(null)

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
              {MOCK_COMPETITORS.map((comp, i) => (
                <>
                  <tr
                    key={comp.name}
                    onClick={() => setExpanded(expanded === comp.name ? null : comp.name)}
                    className="border-b border-[rgba(0,0,0,0.04)] cursor-pointer hover:bg-[#F8F9FB] transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <div className="text-[13px] font-semibold text-[#0A0A0A]">{comp.name}</div>
                      <div className="text-[11px] text-[#A3A3A3]">{comp.reviews.toLocaleString()} reviews</div>
                    </td>
                    <td className="px-6 py-3.5 text-[13px] font-mono text-[#0A0A0A] text-right">₹{comp.price.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-3.5 text-[13px] text-[#6B6B6B]">
                      ⭐ {comp.rating}
                    </td>
                    <td className="px-6 py-3.5 text-[12px] text-[#6B6B6B] hidden md:table-cell max-w-[160px]">{comp.strength}</td>
                    <td className="px-6 py-3.5 text-[12px] text-[#EF4444] hidden md:table-cell max-w-[160px]">{comp.gap}</td>
                  </tr>
                  <AnimatePresence>
                    {expanded === comp.name && (
                      <tr key={`${comp.name}-expanded`}>
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
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Key Strength</p>
                                  <p className="text-[13px] text-[#444]">{comp.strength}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#EF4444] mb-1.5">Exploitable Gap</p>
                                  <p className="text-[13px] text-[#444]">{comp.gap}</p>
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
          {MOCK_COMPETITORS.map(c => (
            <div
              key={c.name}
              className="absolute flex flex-col items-center"
              style={{
                left: `${15 + ((c.price - 1200) / 3200) * 70}%`,
                top: `${85 - ((c.rating - 3.5) / 1.2) * 65}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="w-3 h-3 rounded-full bg-[#0A0A0A] border-2 border-white shadow-sm" />
              <span className="text-[9px] font-semibold text-[#6B6B6B] mt-0.5 whitespace-nowrap">{c.name.split(' ')[0]}</span>
            </div>
          ))}
          {/* Your brand */}
          <div
            className="absolute flex flex-col items-center"
            style={{ left: '52%', top: '30%', transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#C8F04A] border-2 border-[#0A0A0A] shadow-sm" />
            <span className="text-[9px] font-bold text-[#0A0A0A] mt-0.5">YourBrand</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function TrendsTab() {
  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
        <h3 className="text-[14px] font-bold text-[#0A0A0A] mb-1">12-Month Trend Velocity</h3>
        <p className="text-[12px] text-[#A3A3A3] mb-5">Google Trends interest score (0–100) for protein sub-categories</p>
        <TrendVelocityChart
          data={MOCK_TRENDS_DATA}
          mode="trend"
          keys={MOCK_TRENDS_CHART_KEYS}
          height={220}
        />
      </div>

      {/* Trend cards */}
      <div>
        <h3 className="text-[13px] font-bold text-[#0A0A0A] uppercase tracking-wider mb-3">Detected Trend Signals</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {MOCK_TREND_CARDS.map((t, i) => (
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
      </div>
    </div>
  )
}

function ConceptsTab() {
  return (
    <div className="space-y-6">
      {MOCK_CONCEPTS.map((concept, i) => (
        <motion.div
          key={concept.rank}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 * i }}
        >
          <ConceptCard concept={concept} />
        </motion.div>
      ))}
    </div>
  )
}

function GTMTab() {
  return (
    <div className="space-y-6">
      {/* Launch channels */}
      <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
          <h3 className="text-[14px] font-bold text-[#0A0A0A]">Recommended Launch Channels</h3>
        </div>
        {GTM_CHANNELS.map((ch, i) => (
          <div key={ch.rank} className={`flex items-start gap-4 px-6 py-4 ${i < GTM_CHANNELS.length - 1 ? 'border-b border-[rgba(0,0,0,0.04)]' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-[#0F0F0F] text-[#C8F04A] flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              {ch.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-semibold text-[#0A0A0A]">{ch.channel}</p>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${
                  ch.roi === 'Highest' ? 'bg-[#0F0F0F] text-[#C8F04A]' :
                  ch.roi === 'High'    ? 'bg-[#dcfce7] text-[#16A34A]' :
                  'bg-[rgba(0,0,0,0.07)] text-[#A3A3A3]'
                }`}>{ch.roi} ROI</span>
              </div>
              <p className="text-[12px] text-[#6B6B6B] mt-1 leading-relaxed">{ch.reason}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 90-day timeline */}
      <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
        <h3 className="text-[14px] font-bold text-[#0A0A0A] mb-5">90-Day Launch Timeline</h3>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-[rgba(0,0,0,0.08)]" />
          <div className="space-y-6">
            {[
              { week: 'Week 1–2',  phase: 'Foundation',  color: '#C8F04A', items: ['Finalise FSSAI claim list', 'Lock flavour formula', 'Brief creative agency'] },
              { week: 'Week 3–4',  phase: 'Pre-launch',  color: '#F59E0B', items: ['Amazon listing optimization + A+ content', 'Seed 10 micro-influencers (gifting)', 'Meesho catalogue setup'] },
              { week: 'Week 5–8',  phase: 'Launch',      color: '#22C55E', items: ['Amazon PPC campaign go-live (₹50K budget)', 'Influencer posts go live', 'Reddit organic seeding'] },
              { week: 'Week 9–12', phase: 'Optimise',    color: '#0EA5E9', items: ['Review ACOS and pause underperforming ad groups', 'Expand to 3 new influencers based on results', 'Begin Flipkart listing'] },
            ].map(phase => (
              <div key={phase.week} className="flex gap-5 pl-10 relative">
                <div
                  className="absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 border-white -translate-x-1/2 flex-shrink-0"
                  style={{ background: phase.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]">{phase.week}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: phase.color + '28', color: phase.color }}>
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
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Budget overview */}
      <div className="rounded-[20px] p-6 text-white" style={{ background: '#0F0F0F' }}>
        <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2">
          <Target size={13} className="text-[#C8F04A]" /> 90-Day Budget Estimate
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Amazon PPC', amount: '₹1.5L', pct: 37 },
            { label: 'Influencers', amount: '₹1.2L', pct: 30 },
            { label: 'Creative', amount: '₹60K', pct: 15 },
            { label: 'Other', amount: '₹72K', pct: 18 },
          ].map(b => (
            <div key={b.label}>
              <div className="text-[11px] text-white/50 mb-1">{b.label}</div>
              <div className="text-[20px] font-bold text-white mb-1.5">{b.amount}</div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#C8F04A] rounded-full" style={{ width: `${b.pct}%` }} />
              </div>
              <div className="text-[10px] text-white/40 mt-1">{b.pct}% of total</div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 mt-5 pt-4 flex items-center justify-between">
          <span className="text-[13px] text-white/60">Total 90-day budget</span>
          <span className="text-[20px] font-bold text-[#C8F04A]">₹4.02L</span>
        </div>
      </div>
    </div>
  )
}

// ── Consumer Intel mock clusters ─────────────────────────────────
const MOCK_CLUSTERS = [
  { id: 'c1', run_id: 'mock', topic_id: 1, topic_label: 'Aftertaste / artificial sweetness', topic_type: 'pain_point' as const, representative_words: ['sweet','artificial','aftertaste'], review_count: 312, avg_sentiment: -0.62, sample_reviews: ['The artificial sweetener taste is overwhelming after the 2nd week.', 'Way too sweet — I had to mix with plain water and even then it stings.'] },
  { id: 'c2', run_id: 'mock', topic_id: 2, topic_label: 'Bloating and stomach issues', topic_type: 'pain_point' as const, representative_words: ['bloating','gas','stomach'], review_count: 228, avg_sentiment: -0.51, sample_reviews: ['Gets me bloated every time. Switched to isolate and it\'s better.'] },
  { id: 'c3', run_id: 'mock', topic_id: 3, topic_label: 'Mixability in shaker', topic_type: 'praise' as const, representative_words: ['mixes','shaker','smooth'], review_count: 189, avg_sentiment: 0.78, sample_reviews: ['Mixes perfectly in 15 seconds. No lumps at all.'] },
  { id: 'c4', run_id: 'mock', topic_id: 4, topic_label: 'Sugar-free variant request', topic_type: 'feature_request' as const, representative_words: ['sugar-free','diabetic','no sugar'], review_count: 156, avg_sentiment: 0.1, sample_reviews: ['Please launch a stevia-sweetened or totally unsweetened variant.'] },
  { id: 'c5', run_id: 'mock', topic_id: 5, topic_label: 'Third-party lab certification', topic_type: 'feature_request' as const, representative_words: ['lab test','certificate','authentic'], review_count: 134, avg_sentiment: -0.1, sample_reviews: ['I\'d pay more if I could see actual NABL lab test results on the pack.'] },
  { id: 'c6', run_id: 'mock', topic_id: 6, topic_label: 'Value for money', topic_type: 'praise' as const, representative_words: ['value','price','worth'], review_count: 290, avg_sentiment: 0.64, sample_reviews: ['Best value per gram of protein in this range. No contest.'] },
]

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

  // Use mock data (will be replaced by real API call)
  const run = MOCK_RUN

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
              <span>Market: {run.target_market}</span>
              {run.brand_name && <span>· Brand: {run.brand_name}</span>}
              <span>· Generated {formatDate(run.created_at)}</span>
              <span>· Duration: {formatDuration(run.duration_seconds)}</span>
            </div>
          </motion.div>

          {/* Download buttons */}
          <motion.div
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <button className="btn btn-outline btn-sm flex items-center gap-1.5">
              <FileText size={13} /> PDF
            </button>
            <button className="btn btn-outline btn-sm flex items-center gap-1.5">
              <Presentation size={13} /> PPT
            </button>
            <button className="btn btn-black btn-sm flex items-center gap-1.5">
              <Download size={13} /> Export all
            </button>
          </motion.div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Tabs tabs={REPORT_TABS}>
          {(activeTab) => (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview'    && <OverviewTab />}
              {activeTab === 'consumer'    && (
                <ConsumerIntelTab
                  clusters={MOCK_CLUSTERS}
                  totalPositive={720}
                  totalNeutral={390}
                  totalNegative={540}
                />
              )}
              {activeTab === 'competitors' && <CompetitorTab />}
              {activeTab === 'trends'      && <TrendsTab />}
              {activeTab === 'concepts'    && <ConceptsTab />}
              {activeTab === 'gtm'         && <GTMTab />}
            </motion.div>
          )}
        </Tabs>
      </motion.div>
    </div>
  )
}
