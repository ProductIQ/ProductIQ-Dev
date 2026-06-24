// src/pages/NewReportPage.tsx
// New Report — full-featured launch page.
// Layout: left form + right sidebar · bottom: agent pipeline + data sources strip

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowRight, ChevronRight, Check, Clock,
  BarChart3, FileText, Zap, Globe2, ShieldCheck, Brain,
} from 'lucide-react'
import { useStartRun } from '@/hooks/useRuns'
import { useAuth } from '@/hooks/useAuth'
import { AGENT_DEFINITIONS } from '@/types/agent'
import { useNavigate } from 'react-router-dom'
import { MOCK_RUNS } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'

const schema = z.object({
  product_category: z.string().min(3, 'Enter at least 3 characters'),
  brand_name:       z.string().optional(),
  target_market:    z.string(),
})
type Form = z.infer<typeof schema>

const MARKETS = [
  'India',
  'India — Tier 1 cities',
  'India — Tier 2+ cities',
  'India — Pan India D2C',
  'Global',
]

const EXAMPLE_CATEGORIES = [
  'Whey Protein', 'Face Serum', 'Baby Formula',
  'Energy Bars', 'Ayurvedic Hair Oil', 'Plant Protein',
]

// ── Agent pipeline row ────────────────────────────────────────────────────────
// Groups the 8+ agents into a visual pipeline with three stages
const PIPELINE_STAGES = [
  {
    stage: '01 · Collect',
    color: '#A3A3A3',
    agents: ['Web Scraper', 'Review Miner', 'Trend Spotter', 'Social Scout'],
    duration: '~3 min',
    desc: 'Scrapes Amazon, Flipkart, Reddit, X and Google Trends for raw data',
  },
  {
    stage: '02 · Analyse',
    color: '#6B6B6B',
    agents: ['Competitor Intel', 'Price Optimizer', 'Market Sizer', 'Sentiment Tracker'],
    duration: '~4 min',
    desc: 'Maps competitors, prices, TAM/SAM/SOM, and brand sentiment scores',
  },
  {
    stage: '03 · Synthesise',
    color: '#0A0A0A',
    agents: ['Insight Synthesizer', 'Product Innovator', 'GTM Strategist', 'Report Builder'],
    duration: '~2 min',
    desc: 'Generates insights, product concepts, GTM plan, and the final PDF report',
  },
]

function AgentPipeline() {
  return (
    <div className="bg-white rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.07)]">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
        <Brain size={13} className="text-[#A3A3A3]" />
        <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-wider">Agent pipeline</h3>
        <span className="ml-auto text-[10px] font-mono text-[#A3A3A3]">12 agents · parallel execution</span>
      </div>
      <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[rgba(0,0,0,0.05)]">
        {PIPELINE_STAGES.map((stage, i) => (
          <motion.div
            key={stage.stage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="px-6 py-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[9px] font-black uppercase tracking-[0.12em]"
                style={{ color: stage.color }}
              >
                {stage.stage}
              </span>
              <span className="font-mono text-[10px] text-[#C8C8C8]">{stage.duration}</span>
            </div>
            <p className="text-[11px] text-[#6B6B6B] leading-snug mb-3">{stage.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {stage.agents.map(a => (
                <span
                  key={a}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.04)', color: '#0A0A0A' }}
                >
                  {a}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── Expected outputs card ─────────────────────────────────────────────────────
function ExpectedOutputs() {
  const OUTPUTS = [
    { icon: BarChart3, title: 'Market intelligence report',    sub: '15–25 pages · PDF + slides' },
    { icon: Zap,       title: '3–6 product concepts',         sub: 'With pricing, GTM, and viability score' },
    { icon: Globe2,    title: 'Competitor landscape map',      sub: '10–20 SKUs benchmarked' },
    { icon: FileText,  title: 'Review cluster analysis',       sub: 'Top pain points + unmet needs' },
    { icon: ShieldCheck, title: 'FSSAI compliance check',     sub: 'Regulatory flags for your category' },
  ]
  return (
    <div className="bg-white rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.07)]">
      <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
        <h3 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-wider">What you get</h3>
      </div>
      <div className="divide-y divide-[rgba(0,0,0,0.04)]">
        {OUTPUTS.map((o, i) => {
          const Icon = o.icon
          return (
            <motion.div
              key={o.title}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-4 px-6 py-3.5"
            >
              <div className="w-7 h-7 rounded-[10px] bg-[#F8F9FB] border border-[rgba(0,0,0,0.06)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={12} className="text-[#6B6B6B]" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#0A0A0A]">{o.title}</p>
                <p className="text-[11px] text-[#A3A3A3] mt-0.5">{o.sub}</p>
              </div>
              <Check size={11} className="text-[#C8C8C8] ml-auto flex-shrink-0 mt-1" />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Data sources strip ────────────────────────────────────────────────────────
const DATA_SOURCES = [
  { name: 'Amazon India',  sub: 'Reviews + pricing' },
  { name: 'Flipkart',      sub: 'Listings + prices' },
  { name: 'Reddit India',  sub: 'Community signals' },
  { name: 'Google Trends', sub: 'Search velocity' },
  { name: 'Nykaa / Meesho', sub: 'D2C category data' },
  { name: 'X (Twitter)',   sub: 'Brand mentions' },
]

function DataSourcesStrip() {
  return (
    <div
      className="rounded-[20px] overflow-hidden"
      style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="px-6 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <Globe2 size={11} className="text-white/30" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Data sources</span>
      </div>
      <div className="flex overflow-x-auto scrollbar-none divide-x divide-white/[0.05]">
        {DATA_SOURCES.map(s => (
          <div key={s.name} className="flex-shrink-0 px-6 py-3.5 min-w-[130px]">
            <p className="text-[12px] font-semibold text-white/70">{s.name}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Recent runs mini-list ─────────────────────────────────────────────────────
function RecentRunsSidebar() {
  const navigate = useNavigate()
  const recent   = MOCK_RUNS.slice(0, 4)
  return (
    <div className="bg-white rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.07)]">
      <div className="px-5 py-3.5 border-b border-[rgba(0,0,0,0.05)]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">Recent reports</p>
      </div>
      <div className="divide-y divide-[rgba(0,0,0,0.04)]">
        {recent.map(run => (
          <button
            key={run.id}
            onClick={() => navigate(`/reports/${run.id}`)}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-[#FAFAFA] transition-colors group"
          >
            <div className="w-7 h-7 rounded-[10px] bg-[#F8F9FB] border border-[rgba(0,0,0,0.06)] flex items-center justify-center flex-shrink-0">
              <FileText size={11} className="text-[#A3A3A3]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[#0A0A0A] truncate">{run.product_category}</p>
              <p className="text-[10px] text-[#A3A3A3] mt-0.5">{formatRelativeTime(run.created_at)}</p>
            </div>
            <ChevronRight size={11} className="text-[#D1D5DB] group-hover:text-[#0A0A0A] transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>
      <div className="px-5 py-3.5 border-t border-[rgba(0,0,0,0.05)]" style={{ background: '#FAFAFA' }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-[11px] font-semibold text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors"
        >
          View all reports
        </button>
      </div>
    </div>
  )
}

// ── Run time estimate ─────────────────────────────────────────────────────────
function RunEstimateCard({ remaining, plan }: { remaining: number; plan?: string }) {
  const navigate = useNavigate()
  return (
    <div
      className="rounded-[20px] p-5 flex flex-col gap-4"
      style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1">Estimated run time</p>
        <p className="text-[28px] font-bold text-[#C8F04A] leading-none">~9 min</p>
        <p className="text-[11px] text-white/40 mt-1">12 agents running in parallel</p>
      </div>
      <div className="h-px bg-white/[0.07]" />
      <div className="space-y-2.5">
        {[
          { label: 'Agents activated', value: '12 agents' },
          { label: 'Execution model',  value: 'Parallel' },
          { label: 'Report format',    value: 'PDF + Slides' },
          { label: 'AI model',         value: 'Gemini Pro + Flash' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[11px] text-white/40">{label}</span>
            <span className="text-[11px] font-semibold text-white/70">{value}</span>
          </div>
        ))}
      </div>
      <div className="h-px bg-white/[0.07]" />
      <div>
        <p className="text-[11px] text-white/40 mb-1">Usage</p>
        <p className="text-[12px] font-semibold text-white">
          {plan === 'pro'
            ? 'Included in Pro — unlimited'
            : `1 of ${remaining} free credit${remaining !== 1 ? 's' : ''} remaining`}
        </p>
        {plan !== 'pro' && remaining <= 1 && (
          <button
            onClick={() => navigate('/pricing')}
            className="mt-2 text-[11px] font-bold text-[#C8F04A] hover:underline"
          >
            Upgrade to Pro for unlimited →
          </button>
        )}
      </div>
    </div>
  )
}

// ── Over-limit state ──────────────────────────────────────────────────────────
function OverLimitState() {
  const navigate = useNavigate()
  return (
    <div className="max-w-[480px] mx-auto py-20">
      <div className="bg-white rounded-[24px] p-10 text-center border border-[rgba(0,0,0,0.07)]">
        <p className="text-[11px] font-bold tracking-widest uppercase text-[#A3A3A3] mb-4">Monthly limit reached</p>
        <h2 className="text-[22px] font-bold text-[#0A0A0A] mb-3 tracking-tight">No credits remaining</h2>
        <p className="text-[13px] text-[#6B6B6B] mb-8 leading-relaxed max-w-xs mx-auto">
          Upgrade to Pro for unlimited reports, or refer a brand to unlock 2 more credits.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/pricing')} className="btn btn-black">Upgrade to Pro</button>
          <button className="btn btn-outline">Copy referral link</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function NewReportPage() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const { mutate: startRun, isPending } = useStartRun()
  const remaining    = profile ? profile.reports_limit - profile.reports_used_this_month : 3
  const overLimit    = profile?.plan === 'free' && remaining <= 0

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { target_market: 'India' },
  })

  const catValue = watch('product_category')

  if (overLimit) return <OverLimitState />

  return (
    <div className="max-w-[1100px] mx-auto pb-16 space-y-7">

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-1.5">Intelligence</p>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">New report</h1>
          <p className="text-[13px] text-[#A3A3A3] mt-1.5 leading-relaxed max-w-sm">
            12 agents run simultaneously and deliver a full intelligence report in ~9 minutes.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#A3A3A3]">
          <Clock size={12} />
          <span className="font-mono font-medium">~9 min avg</span>
        </div>
      </motion.div>

      {/* ── Example categories ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.06 }}
        className="flex flex-wrap gap-2"
      >
        <span className="text-[11px] font-semibold text-[#A3A3A3] self-center mr-1">Try:</span>
        {EXAMPLE_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setValue('product_category', cat)}
            className="text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all"
            style={{
              background:   catValue === cat ? '#0F0F0F' : '#F8F9FB',
              color:        catValue === cat ? '#C8F04A' : '#6B6B6B',
              borderColor:  catValue === cat ? '#0F0F0F' : 'rgba(0,0,0,0.06)',
            }}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* ── Main two-col: form + sidebar ── */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[24px] border border-[rgba(0,0,0,0.07)] overflow-hidden"
        >
          <div className="px-7 py-5 border-b border-[rgba(0,0,0,0.05)]">
            <h2 className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-wider">Report configuration</h2>
          </div>

          <form
            onSubmit={handleSubmit(data => startRun({
              product_category: data.product_category,
              target_market:    data.target_market || 'India',
              brand_name:       data.brand_name || undefined,
            }))}
            className="px-7 py-6 space-y-6"
          >
            {/* Product category */}
            <div>
              <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-2">
                Product category <span className="text-red-400">*</span>
              </label>
              <input
                className={`input ${errors.product_category ? 'input-error' : ''}`}
                placeholder="e.g. Whey protein, Face serum, Baby food"
                {...register('product_category')}
              />
              {errors.product_category ? (
                <p className="mt-2 text-[11px] text-red-500">{errors.product_category.message}</p>
              ) : (
                <p className="mt-2 text-[11px] text-[#A3A3A3]">
                  Be specific — "whey protein" works better than "supplements"
                </p>
              )}
            </div>

            {/* Brand name */}
            <div>
              <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-2">
                Brand name{' '}
                <span className="font-normal text-[#A3A3A3]">— optional</span>
              </label>
              <input
                className="input"
                placeholder="e.g. MuscleBlaze, Minimalist"
                {...register('brand_name')}
              />
              <p className="mt-2 text-[11px] text-[#A3A3A3]">
                Leave blank to analyse the entire category across all brands
              </p>
            </div>

            {/* Target market */}
            <div>
              <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-2">
                Target market
              </label>
              <select className="input" style={{ cursor: 'pointer' }} {...register('target_market')}>
                {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Divider */}
            <div className="border-t border-[rgba(0,0,0,0.06)]" />

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-black w-full"
              style={{ height: '52px', borderRadius: '14px', fontSize: '14px' }}
            >
              {isPending ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8F04A] animate-pulse" />
                  Queuing agents…
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  Run intelligence pipeline <ArrowRight size={15} />
                </span>
              )}
            </button>

            <p className="text-[11px] text-[#C8C8C8] text-center">
              {profile?.plan === 'pro'
                ? 'Unlimited reports on your Pro plan.'
                : `Uses 1 of your ${remaining} remaining free report${remaining !== 1 ? 's' : ''} this month.`}
            </p>
          </form>
        </motion.div>

        {/* Right sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.14 }}
          className="flex flex-col gap-5"
        >
          <RunEstimateCard remaining={remaining} plan={profile?.plan} />
          <RecentRunsSidebar />
        </motion.div>
      </div>

      {/* ── Expected outputs ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <ExpectedOutputs />
      </motion.div>

      {/* ── Agent pipeline ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <AgentPipeline />
      </motion.div>

      {/* ── Data sources strip ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
        <DataSourcesStrip />
      </motion.div>

    </div>
  )
}
