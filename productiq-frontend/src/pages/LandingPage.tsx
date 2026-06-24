// src/pages/LandingPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight, ArrowUpRight, ChevronDown, Plus, Minus } from 'lucide-react'

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

const PLATFORMS = [
  { name: 'Amazon', logo: 'https://www.vectorlogo.zone/logos/amazon/amazon-icon.svg' },
  { name: 'Flipkart', logo: 'https://www.freelogovectors.net/wp-content/uploads/2025/07/flipkart-logo-icon-freelogovectors.net_.png' },
  { name: 'Google Trends', logo: 'https://www.vectorlogo.zone/logos/google/google-icon.svg' },
  { name: 'Reddit', logo: 'https://www.vectorlogo.zone/logos/reddit/reddit-icon.svg' },
  { name: 'Instagram', logo: 'https://www.vectorlogo.zone/logos/instagram/instagram-icon.svg' },
  { name: 'Nykaa', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Nykaa_New_Logo.svg/1280px-Nykaa_New_Logo.svg.png' },
  { name: 'IndiaMart', logo: 'https://companieslogo.com/img/orig/INDIAMART.NS-ecf147e0.png?t=1720244492' },
  { name: 'Twitter / X', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/53/X_logo_2023_original.svg' },
  { name: 'FSSAI', logo: 'https://bl-i.thgim.com/public/incoming/rtfvph/article68236678.ece/alternates/FREE_1200/IMG_BL07_fssai--logo.jpg_2_1_DP9T3BRN.jpg' },
  { name: 'Meesho', logo: 'https://static.vecteezy.com/system/resources/previews/050/816/807/non_2x/meesho-transparent-icon-free-png.png' },
  { name: 'JioMart', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/54/JioMart_logo.svg/3840px-JioMart_logo.svg.png' },
  { name: 'Trade India', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/aa/TradeIndia.svg/1280px-TradeIndia.svg.png' },
]

const AGENTS = [
  { n: '01', name: 'Market Scraper',        desc: 'Scrapes 1,000+ products from Amazon & Flipkart in real-time.' },
  { n: '02', name: 'Review Intelligence',   desc: 'Mines and clusters 10,000+ customer reviews for sentiment.' },
  { n: '03', name: 'Competitor Mapper',     desc: 'Maps the full competitor landscape with pricing & positioning.' },
  { n: '04', name: 'Trend Detector',        desc: 'Tracks rising search trends across Google, Reddit & social.' },
  { n: '05', name: 'Insight Synthesizer',   desc: 'Connects all signals into high-confidence market insights.' },
  { n: '06', name: 'Concept Generator',     desc: 'Generates 3 validated product concepts with USP & price.' },
  { n: '07', name: 'GTM Strategist',        desc: 'Builds a full go-to-market plan with channels & timeline.' },
  { n: '08', name: 'Sentiment Tracker',     desc: 'Provides a daily brand health score via Supabase Realtime.' },
  { n: '09', name: 'Price Optimizer',       desc: 'Suggests optimal price points using elasticity modeling.' },
  { n: '10', name: 'Supply Chain Scout',    desc: 'Identifies verified manufacturers and labs for RFQs.' },
  { n: '11', name: 'Compliance Guardian',   desc: 'Performs RAG over FSSAI, FDA, and AYUSH regulations.' },
  { n: '12', name: 'Report Compiler',       desc: 'Produces a 30-page PDF + PPTX pitch deck automatically.' },
]

const STATS = [
  { value: '98%',    label: 'Less Expensive', sub: 'vs. traditional consultants' },
  { value: '12',     label: 'AI Agents',      sub: 'working simultaneously' },
  { value: '10 min', label: 'Time to Report', sub: 'not 6 weeks' },
  { value: '8+',     label: 'Data Sources',   sub: 'scraped in parallel' },
]

const TESTIMONIALS = [
  {
    quote:   'ProductIQ saved me ₹3 lakh in consultant fees in the first month. The competitor intel alone changed how we price.',
    name:    'Priya Sharma',
    company: 'Founder, SkinLogic',
    initial: 'P',
  },
  {
    quote:   'The 12-agent pipeline found a protein market gap I had completely missed. We launched 3 months later and hit ₹50L in month one.',
    name:    'Rahul Mehta',
    company: 'CEO, FitFuel',
    initial: 'R',
  },
]

const FAQS = [
  {
    q: 'How is this different from hiring a consulting firm?',
    a: 'A consulting firm takes 4–6 weeks and charges ₹2–5 lakh. ProductIQ uses 12 specialised AI agents to deliver the same depth of analysis in 10 minutes for ₹999 — or free with referrals.',
  },
  {
    q: 'What data sources do the agents access?',
    a: 'Amazon, Flipkart, Nykaa, Google Trends, Reddit, Instagram, IndiaMart, Trade India, and FSSAI / FDA regulatory databases. All scraped live for your report.',
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
              Replace <em>₹2 lakh</em>{' '}
              consulting<br />reports with{' '}
              <em>10 minutes.</em>
            </motion.h1>

            <motion.p {...fadeUp(0.12)} className="text-[17px] text-[#6B6B6B] leading-[1.65] mb-10 max-w-md">
              12 AI agents scrape Amazon, Reddit, Google Trends and 5 more platforms simultaneously — delivering market intelligence no consultant can match.
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

              {/* Agent list live-running style */}
              <div className="space-y-2.5">
                {AGENTS.slice(0, 5).map((agent, i) => (
                  <motion.div
                    key={agent.n}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.09, duration: 0.4 }}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
                    style={{
                      background: i < 3 ? 'rgba(200,240,74,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${i < 3 ? 'rgba(200,240,74,0.15)' : 'rgba(255,255,255,0.05)'}`,
                    }}
                  >
                    <span className="font-mono text-[10px] text-[#555] w-5 flex-shrink-0">{agent.n}</span>
                    <span className="text-[12px] font-medium flex-1" style={{ color: i < 3 ? '#E8FFA0' : '#666' }}>
                      {agent.name}
                    </span>
                    {i < 3 ? (
                      <span className="text-[10px] flex items-center gap-1 text-[#C8F04A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C8F04A] animate-pulse" />
                        Done
                      </span>
                    ) : i === 3 ? (
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
                  <span className="text-[10px] font-mono text-[#555]">PROGRESS</span>
                  <span className="text-[10px] font-mono text-[#C8F04A]">42%</span>
                </div>
                <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: '#C8F04A' }}
                    initial={{ width: '0%' }}
                    animate={{ width: '42%' }}
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
                    <div className="text-[10px] text-[#555] font-mono tracking-widest uppercase mb-1">ETA</div>
                    <div className="text-[13px] text-[#C8F04A] font-medium font-mono">~6 min</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────── PLATFORM MARQUEE ─────── */}
      <div className="py-16 overflow-hidden relative" style={{ borderTop: '1px solid rgba(0,0,0,0.07)', borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#fff' }}>
        <div className="text-label text-center mb-10">Data Sourced From</div>
        
        {/* Row 1 */}
        <div className="marquee-track mb-5">
          {[...PLATFORMS, ...PLATFORMS, ...PLATFORMS].map((p, i) => (
            <div key={`row1-${i}`} className="flex items-center gap-3 px-5 py-3 mx-4 rounded-2xl bg-[#F8F9FB] border border-gray-100 flex-shrink-0 shadow-sm">
              <img 
                src={p.logo} 
                alt={p.name}
                className="w-6 h-6 rounded-md object-contain bg-white"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${p.name}&background=random&color=fff&size=64`
                }}
              />
              <span className="text-[14px] font-bold text-[#0A0A0A] whitespace-nowrap">
                {p.name}
              </span>
            </div>
          ))}
        </div>

        {/* Row 2 (Reverse) */}
        <div className="marquee-track-reverse">
          {[...[...PLATFORMS].reverse(), ...[...PLATFORMS].reverse(), ...[...PLATFORMS].reverse()].map((p, i) => (
            <div key={`row2-${i}`} className="flex items-center gap-3 px-5 py-3 mx-4 rounded-2xl bg-[#F8F9FB] border border-gray-100 flex-shrink-0 shadow-sm">
              <img 
                src={p.logo} 
                alt={p.name}
                className="w-6 h-6 rounded-md object-contain bg-white"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${p.name}&background=random&color=fff&size=64`
                }}
              />
              <span className="text-[14px] font-bold text-[#0A0A0A] whitespace-nowrap">
                {p.name}
              </span>
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
              From a product idea to <em>full intelligence</em> — in three steps.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                step: '01',
                title: 'You enter your product category.',
                desc: 'Just a category name and optional brand. No complex setup, no briefing calls.',
              },
              {
                step: '02',
                title: '12 AI agents go to work simultaneously.',
                desc: 'They scrape, mine, analyse, trend-spot, synthesize, and strategize — all in parallel.',
              },
              {
                step: '03',
                title: 'You receive a 30-page intelligence report.',
                desc: 'PDF + PPTX with competitive landscape, product concepts, and GTM strategy.',
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
                12 agents. <em>One complete picture</em> of your market.
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
              Intelligence that used to cost ₹2 lakh.{' '}
              <span style={{ color: '#C8F04A' }}>Now ₹999.</span>
            </h2>
            <p className="text-[15px] text-[#888] mb-10 max-w-md mx-auto leading-[1.7]">
              Join 500+ D2C founders who replaced expensive consultants with 12 AI agents. Your first 3 reports are free.
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
