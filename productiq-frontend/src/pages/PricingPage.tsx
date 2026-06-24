// src/pages/PricingPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Check, Zap, ChevronDown, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

// ── Plan data ─────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthly: '₹0',
    yearly: '₹0',
    period: 'forever',
    desc: '3 reports per month, forever.',
    featured: false,
    dark: false,
    cta: 'Get started free',
    ctaAction: 'signup',
    features: [
      'Agents 1–5 (scraping to insights)',
      '3 intelligence reports / month',
      '1 product category per report',
      'PDF download',
      'Weekly email digest',
      'Referral unlocks extra reports',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: '₹999',
    yearly: '₹6,999',
    yearlyTotal: '₹47,988/yr',
    period: '/month',
    payPerReport: '₹999 / report — pay as you go',
    desc: 'For serious D2C brands scaling multiple SKUs.',
    featured: true,
    dark: false,
    cta: 'Start Pro',
    ctaAction: 'checkout',
    features: [
      'All 12 AI agents',
      'Unlimited reports',
      'Real-time brand sentiment',
      'Price optimizer & alerts',
      'Slack + WhatsApp notifications',
      'PDF + PowerPoint export',
      'API access: 100 calls/day',
      'Priority processing',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: 'Custom',
    yearly: 'Custom',
    period: '',
    desc: '₹50K–₹2L / month · Custom scope.',
    featured: false,
    dark: true,
    cta: 'Contact us',
    ctaAction: 'contact',
    features: [
      'White-label reports',
      'Custom AI agents',
      'Neo4j knowledge graph',
      'On-prem deployment option',
      'Tamil + English language support',
      'Agent marketplace',
      'Dedicated account manager',
      'Custom SLA',
    ],
  },
]

const FAQ = [
  {
    q: 'How is ProductIQ different from hiring a consultant?',
    a: 'A traditional FMCG consultant charges ₹2–5 lakh for a market research report that takes 4–6 weeks. ProductIQ\'s 12 AI agents do the same work in ~10 minutes for ₹999. You get a structured PDF + PPTX with scraped competitor data, real consumer reviews, trend analysis, product concepts, and a full GTM strategy.',
  },
  {
    q: 'What data sources do the agents use?',
    a: 'Amazon, Flipkart, Meesho (product & review data), Reddit, Twitter, Instagram (social sentiment), Google Trends (search velocity), IndiaMART/Alibaba (supplier discovery), and FSSAI/BIS/AYUSH regulation databases for the Compliance Guardian agent.',
  },
  {
    q: 'Is my data private and secure?',
    a: 'Yes. Each user\'s data is isolated via row-level security in Supabase. Your product category, brand name, and report data are never used to train models or shared with other customers. Reports are stored encrypted in Supabase Storage.',
  },
  {
    q: 'Can I cancel my Pro subscription anytime?',
    a: 'Absolutely. Cancel anytime from Settings → Billing → Manage subscription. Your Pro features remain active until the end of the current billing period. No cancellation fees.',
  },
  {
    q: 'Do you support Tamil language reports?',
    a: 'Tamil-language summaries are on the Enterprise roadmap. Agents currently process Tamil reviews and social posts via multilingual embeddings, but report output is in English. Tamil output is planned for Q3 2026.',
  },
]

function FAQItem({ item }: { item: typeof FAQ[0] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[rgba(0,0,0,0.08)] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="text-[14px] font-semibold text-[#0A0A0A]">{item.q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="text-[#A3A3A3] flex-shrink-0" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed pb-4">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export function PricingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  function handleCTA(plan: typeof PLANS[0]) {
    if (plan.ctaAction === 'signup') navigate(isAuthenticated ? '/dashboard' : '/signup')
    else if (plan.ctaAction === 'checkout') navigate(isAuthenticated ? '/dashboard' : '/signup?plan=pro')
    else if (plan.ctaAction === 'contact') window.location.href = 'mailto:hello@productiq.in'
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-[#0A0A0A] font-sans">

      {/* ── Nav ── */}
      <nav className="h-14 border-b border-[rgba(0,0,0,0.07)] bg-white/80 backdrop-blur-sm flex items-center px-6 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-lg border border-[rgba(0,0,0,0.1)] flex items-center justify-center hover:bg-[#F0F2F5] transition-colors"
            >
              <ArrowLeft size={14} className="text-[#6B6B6B]" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0F0F0F] flex items-center justify-center">
                <Zap size={13} className="text-[#C8F04A]" />
              </div>
              <span className="text-[15px] font-bold text-[#0A0A0A]">ProductIQ</span>
            </div>
          </div>
          <div>
            {isAuthenticated ? (
              <button onClick={() => navigate('/dashboard')} className="btn btn-black btn-sm">
                Dashboard →
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/login')} className="text-[13px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
                  Sign in
                </button>
                <button onClick={() => navigate('/signup')} className="btn btn-black btn-sm">
                  Get started free
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="text-center py-16 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-block bg-[#0F0F0F] text-[#C8F04A] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-5">
            10-minute market research · Built for D2C brands
          </span>
          <h1 className="text-[42px] font-bold tracking-tight text-[#0A0A0A] leading-tight mb-4">
            Replace ₹2 lakh<br />consulting reports
          </h1>
          <p className="text-[17px] text-[#6B6B6B] leading-relaxed">
            AI intelligence reports for D2C brands — from ₹999 or free with referrals.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-3 mt-8"
        >
          <span className={`text-[14px] font-medium transition-colors ${billing === 'monthly' ? 'text-[#0A0A0A]' : 'text-[#A3A3A3]'}`}>
            Monthly
          </span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-11 rounded-full transition-colors duration-200`}
            style={{ height: 24, background: billing === 'yearly' ? '#0A0A0A' : 'rgba(0,0,0,0.15)' }}
          >
            <motion.span
              className="absolute top-0.5 left-0.5 w-[20px] h-[20px] rounded-full bg-white shadow-sm"
              animate={{ x: billing === 'yearly' ? 20 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          </button>
          <span className={`text-[14px] font-medium transition-colors ${billing === 'yearly' ? 'text-[#0A0A0A]' : 'text-[#A3A3A3]'}`}>
            Yearly
            <span className="ml-1.5 text-[11px] font-bold bg-[#dcfce7] text-[#16A34A] px-1.5 py-0.5 rounded-full">
              Save 20%
            </span>
          </span>
        </motion.div>
      </div>

      {/* ── Plan Cards ── */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.08 }}
              className={`relative flex flex-col rounded-[24px] ${
                plan.featured ? 'md:scale-[1.03] md:shadow-[0_16px_48px_rgba(0,0,0,0.12)] z-10' : 'z-0'
              } ${
                  plan.dark
                    ? 'bg-[#0F0F0F] text-white border border-[rgba(255,255,255,0.07)]'
                    : plan.featured
                    ? 'bg-white border-2 border-[#0A0A0A]'
                    : 'bg-white border border-[rgba(0,0,0,0.08)]'
              }`}
            >
              {/* Most popular badge */}
              {plan.featured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <span className="bg-[#0F0F0F] text-[#C8F04A] text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex flex-col flex-1 p-8">
                {/* Plan name */}
                <div className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${
                  plan.dark ? 'text-white/40' : 'text-[#A3A3A3]'
                }`}>{plan.name}</div>

                {/* Price */}
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className={`text-[36px] font-bold tracking-tight ${
                    plan.dark ? 'text-[#C8F04A]' : 'text-[#0A0A0A]'
                  }`}>
                    {billing === 'yearly' && plan.yearly !== plan.monthly ? (
                      <>
                        {plan.yearly}
                        {plan.monthly !== '₹0' && plan.monthly !== 'Custom' && (
                          <span className="text-[22px] text-[#A3A3A3] line-through ml-2">{plan.monthly}</span>
                        )}
                      </>
                    ) : plan.monthly}
                  </span>
                  {plan.period && (
                    <span className={`text-[14px] ${plan.dark ? 'text-white/40' : 'text-[#A3A3A3]'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                {billing === 'yearly' && plan.yearlyTotal && (
                  <p className={`text-[12px] mb-1 ${plan.dark ? 'text-white/40' : 'text-[#A3A3A3]'}`}>
                    {plan.yearlyTotal} billed annually
                  </p>
                )}
                {plan.payPerReport && (
                  <p className={`text-[12px] mb-1 ${plan.dark ? 'text-white/50' : 'text-[#A3A3A3]'}`}>
                    or {plan.payPerReport}
                  </p>
                )}
                <p className={`text-[13px] mt-2 mb-6 leading-relaxed ${plan.dark ? 'text-white/50' : 'text-[#6B6B6B]'}`}>
                  {plan.desc}
                </p>

                {/* Divider */}
                <div className={`border-t mb-6 ${plan.dark ? 'border-white/10' : 'border-[rgba(0,0,0,0.07)]'}`} />

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-7">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check
                        size={14}
                        className={`flex-shrink-0 mt-0.5 ${plan.dark ? 'text-[#C8F04A]' : 'text-[#16A34A]'}`}
                      />
                      <span className={`text-[13px] leading-[1.5] ${plan.dark ? 'text-white/70' : 'text-[#444]'}`}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleCTA(plan)}
                  className={`w-full py-3.5 rounded-xl text-[13px] font-bold transition-all duration-150 hover:-translate-y-0.5 flex items-center justify-center gap-2 ${
                    plan.dark
                      ? 'bg-[#C8F04A] text-[#0A0A0A] hover:bg-[#d4f560]'
                      : plan.featured
                      ? 'bg-[#0A0A0A] text-white hover:bg-[#222]'
                      : 'bg-[#F0F2F5] text-[#0A0A0A] hover:bg-[#E2E4E9]'
                  }`}
                >
                  {plan.featured && <Zap size={14} />}
                  {plan.cta}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-6 mt-10 text-[13px] text-[#A3A3A3]"
        >
          {['No credit card required', 'Cancel anytime', 'Data encrypted at rest', 'Built for Indian D2C brands'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <Check size={12} className="text-[#22C55E]" /> {t}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ── FAQ ── */}
      <div className="max-w-2xl mx-auto px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-[24px] font-bold text-[#0A0A0A] text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="bg-white rounded-[24px] border border-[rgba(0,0,0,0.07)] px-8 py-2 divide-y divide-[rgba(0,0,0,0.06)]">
            {FAQ.map((item, i) => (
              <FAQItem key={i} item={item} />
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-14"
        >
          <p className="text-[14px] text-[#A3A3A3] mb-4">Still have questions?</p>
          <a
            href="mailto:hello@productiq.in"
            className="text-[14px] font-semibold text-[#0A0A0A] underline underline-offset-4 hover:text-[#6B6B6B] transition-colors"
          >
            Email us at hello@productiq.in →
          </a>
        </motion.div>
      </div>
    </div>
  )
}
