// src/pages/LandingPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight, ArrowUpRight, Plus, Minus, ShoppingCart, Star, TrendingUp, MessageSquare, Factory, FileText, DollarSign, Search, Megaphone, Rocket, BarChart2, Film } from 'lucide-react'

// ── Animation helpers ──────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 28 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay },
})

const NAV_LINKS = [
  { label: 'How It Works', id: 'how-it-works' },
  { label: 'Agents', id: 'agents' },
  { label: 'Proof', id: 'proof' },
  { label: 'Pricing', path: '/pricing' }
]

// Data capability categories — Lucide icons, represents what the 20 agents ingest
const DATA_SIGNALS = [
  { Icon: ShoppingCart, label: 'E-commerce Listings',  tag: 'Live product data' },
  { Icon: Star,         label: 'Consumer Reviews',      tag: '10,000+ per run' },
  { Icon: TrendingUp,   label: 'Search Trend Velocity', tag: 'Google Trends API' },
  { Icon: MessageSquare,label: 'Social Sentiment',      tag: 'Reddit · X · Instagram' },
  { Icon: Factory,      label: 'Supplier Intelligence', tag: 'B2B marketplaces' },
  { Icon: FileText,     label: 'Regulatory Filings',    tag: 'FSSAI · FDA · AYUSH' },
  { Icon: DollarSign,   label: 'Live Price Signals',    tag: 'Cross-platform pricing' },
  { Icon: Search,       label: 'SERP Intelligence',     tag: 'SerpAPI integration' },
  { Icon: Megaphone,    label: 'Brand Mentions',        tag: 'PR & news monitoring' },
  { Icon: Rocket,       label: 'Product Launches',      tag: 'Competitor launches' },
  { Icon: BarChart2,    label: 'Market Sizing Data',    tag: 'TAM · SAM · SOM' },
  { Icon: Film,         label: 'Creator Content',       tag: 'YouTube · Reels trends' },
]

const AGENTS = [
  { n: '01', name: '✦Web Scraper',              desc: 'Scrapes 1,000+ product listings across e-commerce platforms via Apify.' },
  { n: '02', name: '✦Review Miner',             desc: 'Mines and clusters 10,000+ reviews using Gemini-based sentiment analysis.' },
  { n: '03', name: '✦Competitor Intel',         desc: 'Maps the full competitor landscape with pricing, positioning & gaps.' },
  { n: '04', name: '✦Trend Spotter',            desc: 'Tracks rising search trends across Google Trends, Reddit & social.' },
  { n: '05', name: '✦Insight Synthesizer',      desc: 'Connects all signals into high-confidence market insights using 1M-token context.' },
  { n: '06', name: '✦Product Innovator',        desc: 'Generates 3 validated product concepts with USP, pricing & differentiation.' },
  { n: '07', name: '✦GTM Strategist',           desc: 'Builds a full go-to-market plan with channels, timeline & budget.' },
  { n: '08', name: '✦Report Builder',           desc: 'Produces a 30-page PDF + PPTX pitch deck automatically.' },
  { n: '09', name: '✦Sentiment Tracker',        desc: 'Daily brand health score via Realtime — flags sentiment drops instantly.' },
  { n: '10', name: '✦Price Optimizer',          desc: 'Suggests optimal price points using elasticity modeling — runs every morning.' },
  { n: '11', name: '✦Supply Chain Scout',       desc: 'Identifies verified manufacturers and labs for RFQs. Weekly refresh.' },
  { n: '12', name: '✦Compliance Guardian',      desc: 'Performs RAG over FSSAI, FDA, and AYUSH regulations on-demand.' },
  { n: '13', name: '✦Social Scout',       desc: 'Extracts viral content, creator reviews, and trending hashtags from Instagram & YouTube.' },
  { n: '14', name: '✦Market Sizer',       desc: 'Estimates TAM/SAM/SOM using Indian market data, IBEF & Statista cross-referencing.' },
  { n: '15', name: '✦Brand Mention Tracker', desc: 'Scans Google News, Reddit & X every 4h. Alerts on PR crises and viral wins.' },
  { n: '16', name: '✦Competitor Launch Scout', desc: 'Detects new competitor product launches every 6h and alerts you before they scale.' },
  { n: '17', name: '✦Trend Velocity Monitor', desc: 'Re-scores top 20 trends every 2h — flags breakout trends before competitors can act.' },
  { n: '18', name: '✦AI Chat Agent',      desc: 'RAG-powered assistant answers questions about your data, market, and competitors.' },
  { n: '19', name: '✦Report Comparator',  desc: 'Cross-run delta: shows exactly what changed since your last intelligence run.' },
  { n: '20', name: '✦Concept Validator',  desc: 'Validates your product hypothesis against real market data in ~90 seconds.' },
]

const STATS = [
  { value: '98%',     label: 'Less Expensive',   sub: 'vs. traditional consultants' },
  { value: '20',      label: 'AI Agents',         sub: 'running in parallel' },
  { value: '<11 min', label: 'Time to Report',    sub: 'not 6 weeks' },
  { value: '24/7',    label: 'Live Monitoring',   sub: 'continuous intelligence' },
]

const TESTIMONIALS = [
  {
    quote:   'ProductIQ saved me ₹3 lakh in consultant fees in the first month. The competitor intel alone changed how we price.',
    name:    'Priya Sharma',
    company: 'Founder, SkinLogic',
    initial: 'P',
  },
  {
    quote:   'The 20-agent pipeline found a protein market gap I had completely missed. We launched 3 months later and hit ₹50L in month one.',
    name:    'Rahul Mehta',
    company: 'CEO, FitFuel',
    initial: 'R',
  },
]

const FAQS = [
  {
    q: 'How is this different from hiring a consulting firm?',
    a: 'A consulting firm takes 4–6 weeks and charges ₹2–5 lakh. ProductIQ v2 deploys 20 specialised AI agents in a parallel DAG pipeline — delivering the same depth of analysis in under 11 minutes for ₹999, with 24/7 continuous market monitoring included.',
  },
  {
    q: 'What data sources do the agents access?',
    a: 'Our agents ingest live e-commerce listings, consumer reviews, Google Trends velocity, social sentiment (Reddit, Instagram, X), B2B supplier intelligence, brand mentions from Google News, and FSSAI/FDA regulatory filings — all via production-grade APIs like Apify and SerpAPI. No brittle scraping.',
  },
  {
    q: 'Is my product data private?',
    a: 'Yes. Every report run is isolated per user with row-level database security. Your product intelligence is never shared, sold, or used to train models.',
  },
  {
    q: 'When can I cancel?',
    a: 'Any time. Cancel from your billing settings — no questions, no lock-in contracts.',
  },
]

// ── Component ──────────────────────────────────────────────────
export function LandingPage() {
  const navigate       = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-[#0A0A0A] font-sans overflow-x-hidden">

      {/* ─────── NAVBAR ─────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-16"
        style={{ background: 'rgba(240,242,245,0.88)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0A0A0A] flex items-center justify-center flex-shrink-0">
              <span className="text-[#C8F04A] font-bold text-xs tracking-tight">IQ</span>
            </div>
            <span className="font-semibold text-[15px] tracking-tight">ProductIQ</span>
          </button>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <button 
                key={l.label} 
                onClick={() => {
                  if (l.path) {
                    navigate(l.path);
                  } else if (l.id) {
                    document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors font-medium"
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:block text-[13px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors px-3 py-2"
            >
              Sign in
            </button>
            <button onClick={() => navigate('/signup')} className="btn btn-black btn-sm">
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* ─────── HERO ─────── */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Subtle background grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">

          {/* Left — Editorial headline */}
          <div>
            {/* Eyebrow tag */}
            <motion.div {...fadeUp(0)} className="mb-8">
              <span
                className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase px-3.5 py-2 rounded-full"
                style={{ background: '#0A0A0A', color: '#C8F04A' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8F04A] animate-pulse" />
                Product Intelligence OS
              </span>
            </motion.div>

            {/* Headline — bettrlabs editorial style: bold + italic mix */}
            <motion.h1 {...fadeUp(0.06)} className="headline-mix text-[52px] lg:text-[64px] mb-6">
              Your market<br />intelligence <em>OS.</em>{' '}
              Running <em>24/7.</em>
            </motion.h1>

            <motion.p {...fadeUp(0.12)} className="text-[17px] text-[#6B6B6B] leading-[1.65] mb-10 max-w-md">
              20 AI agents run in parallel — scraping, analysing, and monitoring your market continuously. Replace ₹2 lakh consulting reports with real-time intelligence that never sleeps.
            </motion.p>

            {/* Trust row */}
            <motion.div {...fadeUp(0.16)} className="flex items-center gap-6 mb-10 flex-wrap">
              {['3 reports free', 'No credit card', 'Cancel anytime'].map((t) => (
                <span key={t} className="flex items-center gap-2 text-[13px] text-[#6B6B6B]">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6.5" stroke="#22C55E" strokeWidth="1.2"/>
                    <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="#22C55E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t}
                </span>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div {...fadeUp(0.20)} className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => navigate('/signup')}
                className="btn btn-black btn-lg group"
              >
                Start free — 3 reports included
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => navigate('/reports/run-001/status')}
                className="btn btn-outline btn-lg"
              >
                Watch demo
              </button>
            </motion.div>
          </div>

          {/* Right — Dark preview card */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <div
              className="rounded-[28px] p-6 w-full"
              style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Fake terminal-style header */}
              <div className="flex items-center gap-1.5 mb-5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                <span className="ml-3 text-[11px] font-mono text-[#444] tracking-wide">productiq — intelligence run</span>
              </div>

              {/* Agent list live-running style — v2 20 agents */}
              <div className="space-y-2.5">
                {AGENTS.slice(0, 6).map((agent, i) => (
                  <motion.div
                    key={agent.n}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.09, duration: 0.4 }}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
                    style={{
                      background: i < 4 ? 'rgba(200,240,74,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${i < 4 ? 'rgba(200,240,74,0.15)' : 'rgba(255,255,255,0.05)'}`,
                    }}
                  >
                    <span className="font-mono text-[10px] text-[#555] w-5 flex-shrink-0">{agent.n}</span>
                    <span className="text-[12px] font-medium flex-1" style={{ color: i < 4 ? '#E8FFA0' : '#666' }}>
                      {agent.name}
                    </span>
                    {i < 4 ? (
                      <span className="text-[10px] flex items-center gap-1 text-[#C8F04A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C8F04A] animate-pulse" />
                        Done
                      </span>
                    ) : i === 4 ? (
                      <span className="text-[10px] flex items-center gap-1 text-[#A3A3A3]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#555] animate-pulse" />
                        Running
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#333]">Queued</span>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mt-5">
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-mono text-[#555]">PIPELINE PROGRESS</span>
                  <span className="text-[10px] font-mono text-[#C8F04A]">Phase 2 / 5</span>
                </div>
                <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: '#C8F04A' }}
                    initial={{ width: '0%' }}
                    animate={{ width: '38%' }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.8 }}
                  />
                </div>
              </div>

              {/* Bottom stat */}
              <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-[#555] font-mono tracking-widest uppercase mb-1">Category</div>
                    <div className="text-[13px] text-white font-medium">Whey Protein · India</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#555] font-mono tracking-widest uppercase mb-1">20 Agents · ETA</div>
                    <div className="text-[13px] text-[#C8F04A] font-medium font-mono">~10 min</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────── DATA SIGNALS MARQUEE ─────── */}
      <div className="py-16 overflow-hidden relative" style={{ borderTop: '1px solid rgba(0,0,0,0.07)', borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#fff' }}>
        <div className="text-center mb-10">
          <div className="text-label mb-2">Intelligence Signals</div>
          <p className="text-[13px] text-[#A3A3A3]">20 agents ingest these data streams — continuously, in parallel</p>
        </div>
        
        {/* Row 1 — forward scroll */}
        <div className="marquee-track mb-5">
          {[...DATA_SIGNALS, ...DATA_SIGNALS, ...DATA_SIGNALS].map((s, i) => (
            <div
              key={`row1-${i}`}
              className="flex items-center gap-3 px-5 py-3 mx-4 rounded-2xl flex-shrink-0 shadow-sm"
              style={{ background: '#F8F9FB', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#0A0A0A' }}
              >
                <s.Icon size={15} color="#C8F04A" strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-[13px] font-bold text-[#0A0A0A] whitespace-nowrap leading-tight">{s.label}</div>
                <div className="text-[10px] text-[#A3A3A3] whitespace-nowrap">{s.tag}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Row 2 — reverse scroll */}
        <div className="marquee-track-reverse">
          {[...[...DATA_SIGNALS].reverse(), ...[...DATA_SIGNALS].reverse(), ...[...DATA_SIGNALS].reverse()].map((s, i) => (
            <div
              key={`row2-${i}`}
              className="flex items-center gap-3 px-5 py-3 mx-4 rounded-2xl flex-shrink-0 shadow-sm"
              style={{ background: '#F8F9FB', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#0A0A0A' }}
              >
                <s.Icon size={15} color="#C8F04A" strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-[13px] font-bold text-[#0A0A0A] whitespace-nowrap leading-tight">{s.label}</div>
                <div className="text-[10px] text-[#A3A3A3] whitespace-nowrap">{s.tag}</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Fading edges to blend seamlessly */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      </div>

      {/* ─────── HOW IT WORKS ─────── */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16"
          >
            <div className="text-label mb-4">How It Works</div>
            <h2 className="headline-mix text-[40px] lg:text-[52px] max-w-xl">
              From a product idea to <em>operating system</em> — in three steps.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                step: '01',
                title: 'You connect your category on Day 1.',
                desc: 'Enter a product category and brand. ProductIQ immediately begins 24/7 monitoring — no briefing calls, no onboarding.',
              },
              {
                step: '02',
                title: '20 AI agents run in a parallel pipeline.',
                desc: 'They scrape, mine, analyse, trend-spot, synthesize, monitor, and strategize — concurrently, in under 11 minutes.',
              },
              {
                step: '03',
                title: 'Intelligence compounds over time.',
                desc: 'Every new run compares to the last. Alerts fire when competitors launch, prices shift, or sentiment drops. Knowledge accumulates.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="card p-8"
              >
                <div className="text-[11px] font-mono font-semibold text-[#A3A3A3] mb-6 tracking-widest">{item.step}</div>
                <h3 className="text-[18px] font-semibold leading-[1.35] mb-4 text-[#0A0A0A]">{item.title}</h3>
                <p className="text-[14px] text-[#6B6B6B] leading-[1.7]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────── DARK STATS BANNER ─────── */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          <div
            className="rounded-[28px] p-10 md:p-14"
            style={{ background: '#0F0F0F' }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div
                    className="text-[38px] md:text-[44px] font-bold leading-none mb-2 tracking-tight"
                    style={{ color: '#C8F04A' }}
                  >
                    {s.value}
                  </div>
                  <div className="text-[13px] font-semibold text-white mb-1">{s.label}</div>
                  <div className="text-[12px] text-[#555]">{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} className="pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <p className="text-[16px] text-white max-w-lg leading-[1.6]">
                <strong>ProductIQ didn't replace your team.</strong>{' '}
                It made every hour they spend on strategy count.
              </p>
              <button onClick={() => navigate('/signup')} className="btn btn-lime btn-lg flex-shrink-0">
                Get started free <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────── AGENT GRID ─────── */}
      <section id="agents" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12"
          >
            <div>
              <div className="text-label mb-4">The Intelligence Pipeline</div>
              <h2 className="headline-mix text-[40px] lg:text-[48px] max-w-lg">
                20 agents. <em>One operating system</em> for your market.
              </h2>
            </div>
            <button onClick={() => navigate('/reports/new')} className="btn btn-black flex-shrink-0">
              Run the pipeline <ArrowUpRight size={14} />
            </button>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {AGENTS.map((agent, i) => (
              <motion.div
                key={agent.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="card p-6 group hover:border-black/20 transition-all cursor-default"
              >
                <div className="font-mono text-[11px] text-[#A3A3A3] mb-4 tracking-widest">{agent.n}</div>
                <h3 className="text-[15px] font-semibold text-[#0A0A0A] mb-2 leading-snug">{agent.name}</h3>
                <p className="text-[13px] text-[#6B6B6B] leading-[1.65]">{agent.desc}</p>
                {/* Accent line on hover */}
                <div
                  className="mt-4 h-0.5 w-0 group-hover:w-8 transition-all duration-300 rounded-full"
                  style={{ background: '#C8F04A' }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────── SOCIAL PROOF ─────── */}
      <section id="proof" className="py-20 px-6" style={{ background: '#fff' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between mb-12">
            <div className="text-label">What founders say</div>
            <div className="text-[13px] text-[#A3A3A3]">500+ D2C brands</div>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {TESTIMONIALS.map((t) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-[24px] p-8"
                style={{ background: '#F8F9FB', border: '1px solid rgba(0,0,0,0.06)' }}
              >
                <p className="text-[16px] leading-[1.7] text-[#0A0A0A] mb-8">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                    style={{ background: '#0A0A0A', color: '#C8F04A' }}
                  >
                    {t.initial}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#0A0A0A]">{t.name}</div>
                    <div className="text-[12px] text-[#6B6B6B]">{t.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────── FAQ ─────── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-label mb-5">FAQ</div>
          <h2 className="headline-mix text-[36px] mb-12">
            Questions <em>we get asked</em> a lot.
          </h2>

          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="rounded-[16px] overflow-hidden"
                style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-[15px] font-medium text-[#0A0A0A]">{faq.q}</span>
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {openFaq === i ? <Minus size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
                  </span>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-[14px] text-[#6B6B6B] leading-[1.75]">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────── FINAL CTA ─────── */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div
            className="rounded-[28px] p-10 md:p-16 text-center"
            style={{ background: '#0F0F0F' }}
          >
            <div className="text-label mb-6" style={{ color: '#555' }}>Start Today</div>
            <h2
              className="text-[36px] md:text-[52px] font-bold leading-[1.08] tracking-tight text-white mb-6 max-w-2xl mx-auto"
            >
              Your market intelligence OS.{' '}
              <span style={{ color: '#C8F04A' }}>Always on.</span>
            </h2>
            <p className="text-[15px] text-[#888] mb-10 max-w-md mx-auto leading-[1.7]">
              Join 500+ D2C founders who run 20 AI agents 24/7 instead of paying ₹2 lakh for a static report. Your first 3 runs are free.
            </p>
            <button onClick={() => navigate('/signup')} className="btn btn-lime btn-lg mx-auto">
              Get started — it's free <ArrowRight size={15} />
            </button>
            <p className="text-[12px] text-[#555] mt-5">No credit card · 3 free reports · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* ─────── FOOTER ─────── */}
      <footer style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }} className="py-14 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand col */}
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-[#0A0A0A] flex items-center justify-center flex-shrink-0">
                <span className="text-[#C8F04A] font-bold text-[9px]">IQ</span>
              </div>
              <span className="font-semibold text-[14px]">ProductIQ</span>
            </div>
            <p className="text-[13px] text-[#6B6B6B] leading-[1.7] max-w-[200px]">
              AI product intelligence for D2C brands and FMCG companies.
            </p>
          </div>
          {/* Link columns */}
          {[
            { title: 'Product',  links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
            { title: 'Company',  links: ['About', 'Blog', 'Careers', 'Press'] },
            { title: 'Legal',    links: ['Privacy', 'Terms', 'Security', 'Contact'] },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-label mb-5">{col.title}</div>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
          <p className="text-[12px] text-[#A3A3A3]">© 2026 ProductIQ. Built in India.</p>
          <p className="text-[12px] text-[#A3A3A3]">Compliant with DPDP Act 2023</p>
        </div>
      </footer>
    </div>
  )
}
