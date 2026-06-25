// src/pages/ValidatePage.tsx
// Concept Validator — pre-launch concept scoring.
// Design: matches Dashboard — white cards, dark strip, typographic results.

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { validateConcept, getValidationHistory } from '@/lib/api'
import { type ValidationResult } from '@/lib/mockData'

// ── Progress bar — simple, B&W ───────────────────────────────────────────────
function Bar({ pct, label }: { pct: number; label?: string }) {
  return (
    <div className="space-y-1">
      {label && <p className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3]">{label}</p>}
      <div className="h-1 rounded-full bg-[#F0F2F5] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[#0A0A0A]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ── Score arc — SVG arc, monochrome ─────────────────────────────────────────
function ScoreArc({ score }: { score: number }) {
  const pct   = Math.max(0, Math.min(100, score))
  const r     = 52
  const circ  = 2 * Math.PI * r
  const arc   = circ * 0.75  // 270 degrees
  const fill  = arc * (pct / 100)

  return (
    <div className="flex flex-col items-center">
      <svg width={128} height={96} viewBox="0 0 128 96">
        {/* Background track */}
        <circle
          cx={64} cy={72} r={r}
          fill="none" stroke="#F0F2F5" strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circ}`}
          strokeDashoffset={circ * 0.125}
          transform="rotate(135 64 72)"
        />
        {/* Filled arc */}
        <motion.circle
          cx={64} cy={72} r={r}
          fill="none" stroke="#0A0A0A" strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circ}`}
          strokeDashoffset={circ * 0.125}
          transform="rotate(135 64 72)"
          initial={{ strokeDashoffset: circ * 0.125 + arc }}
          animate={{ strokeDashoffset: circ * 0.125 + arc - fill }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
        {/* Score label */}
        <text x={64} y={76} textAnchor="middle" fontSize={28} fontWeight={700} fill="#0A0A0A">
          {Math.round(pct)}
        </text>
        <text x={64} y={91} textAnchor="middle" fontSize={9} fill="#A3A3A3" letterSpacing={1} fontWeight={600}>
          VIABILITY
        </text>
      </svg>
    </div>
  )
}

// ── Dimension row ────────────────────────────────────────────────────────────
function DimensionRow({ dim }: { dim: ValidationResult['dimensions'][0] }) {
  const isHigh = dim.score >= 65

  return (
    <div className="py-4 border-b border-[rgba(0,0,0,0.05)] last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[13px] font-semibold text-[#0A0A0A]">{dim.name}</p>
          <p className="text-[11px] text-[#6B6B6B] mt-0.5">{dim.summary}</p>
        </div>
        <div className="text-right ml-4 flex-shrink-0">
          <p className="text-[20px] font-bold text-[#0A0A0A] leading-none">{dim.score}</p>
          <p className="text-[9px] font-semibold uppercase tracking-wider mt-0.5"
            style={{ color: isHigh ? '#22C55E' : '#A3A3A3' }}>
            {isHigh ? 'Strong' : 'Moderate'}
          </p>
        </div>
      </div>
      <Bar pct={dim.score} />
    </div>
  )
}

// ── Running validation simulation ────────────────────────────────────────────
function ValidationProgress({ onDone }: { onDone: () => void }) {
  const STEPS = [
    'Analysing market demand signals',
    'Benchmarking against competitor SKUs',
    'Scoring price-elasticity model',
    'Evaluating regulatory constraints',
    'Synthesising viability score',
  ]
  const [step, setStep] = useState(0)
  const [pct, setPct]   = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setPct(p => {
        const next = p + (1 / (STEPS.length * 40)) * 100
        if (next >= 100) { clearInterval(t); setTimeout(onDone, 400); return 100 }
        return next
      })
    }, 40)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    setStep(Math.min(Math.floor((pct / 100) * STEPS.length), STEPS.length - 1))
  }, [pct])

  return (
    <div
      className="rounded-[20px] border border-[rgba(0,0,0,0.07)] bg-white px-8 py-10 flex flex-col items-center text-center"
    >
      <div
        className="w-12 h-12 rounded-[16px] flex items-center justify-center mb-6 text-[14px] font-black"
        style={{ background: '#C8F04A', color: '#0A0A0A' }}
      >
        IQ
      </div>
      <p className="text-[14px] font-bold text-[#0A0A0A] mb-1.5">Evaluating concept</p>
      <p className="text-[12px] text-[#A3A3A3] mb-7">{STEPS[step]}</p>
      <div className="w-full max-w-xs mb-4">
        <div className="h-0.5 rounded-full bg-[#F0F2F5] overflow-hidden">
          <motion.div
            className="h-full bg-[#0A0A0A] rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className="text-[12px] font-mono text-[#A3A3A3]">{Math.round(pct)}%</p>
    </div>
  )
}

// ── Results view ─────────────────────────────────────────────────────────────
function Results({ result, conceptName }: { result: ValidationResult; conceptName: string }) {
  const navigate = useNavigate()
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

      {/* Score card */}
      <div
        className="rounded-[20px] px-8 py-6 flex items-center gap-8"
        style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <ScoreArc score={result.overallScore} />
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Concept</p>
          <h2 className="text-[18px] font-bold text-white mb-3">{conceptName}</h2>
          <p className="text-[13px] text-white/60 leading-relaxed">{result.summary}</p>
          <div className="flex gap-4 mt-4">
            {[
              { label: 'Market fit',   value: result.marketFitScore },
              { label: 'Price fit',    value: result.priceFitScore },
              { label: 'Competitive',  value: result.competitiveScore },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 mb-0.5">{label}</p>
                <p className="text-[17px] font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dimension breakdown */}
      <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[rgba(0,0,0,0.05)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">Dimension breakdown</p>
        </div>
        <div className="px-5">
          {result.dimensions.map(dim => (
            <DimensionRow key={dim.name} dim={dim} />
          ))}
        </div>
      </div>

      {/* Risks & Opportunities — two col */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[rgba(0,0,0,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">Key risks</p>
          </div>
          <div className="px-5 py-4 divide-y divide-[rgba(0,0,0,0.04)]">
            {result.keyRisks.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <div className="w-0.5 self-stretch rounded-full bg-[#D1D5DB] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#6B6B6B] leading-snug">{r}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[rgba(0,0,0,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">Opportunities</p>
          </div>
          <div className="px-5 py-4 divide-y divide-[rgba(0,0,0,0.04)]">
            {result.opportunities.map((o, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <div className="w-0.5 self-stretch rounded-full bg-[#0A0A0A] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#0A0A0A] leading-snug">{o}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] px-5 py-4">
        <p className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">Recommendation</p>
        <p className="text-[13px] text-[#0A0A0A] leading-relaxed">{result.recommendation}</p>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={() => navigate('/chat')}
          className="btn btn-black flex-1 flex items-center justify-center gap-2"
        >
          Discuss with AI <ArrowRight size={13} />
        </button>
        <button
          onClick={() => navigate('/reports/new')}
          className="btn btn-outline flex-1"
        >
          Full market report
        </button>
      </div>
    </motion.div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
type Stage = 'form' | 'running' | 'results'

export function ValidatePage() {
  const [stage, setStage]       = useState<Stage>('form')
  const [conceptName, setCName] = useState('')
  const [form, setForm]         = useState({
    name: '',
    price: '',
    description: '',
    target: '',
    runRef: '',
  })
  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  // ── Real API: validate concept ──────────────────────────────────
  const validateMutation = useMutation({
    mutationFn: (payload: {
      concept_name: string
      description: string
      target_market?: string
      run_id?: string
    }) => validateConcept(payload),
  })

  // ── Real API: validation history ────────────────────────────────
  const { data: history } = useQuery({
    queryKey: ['validationHistory'],
    queryFn: getValidationHistory,
  })

  // Transition to results once the API call succeeds
  useEffect(() => {
    if (validateMutation.isSuccess) setStage('results')
  }, [validateMutation.isSuccess])

  // Return to form on error so the user can retry
  useEffect(() => {
    if (validateMutation.isError) setStage('form')
  }, [validateMutation.isError])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setCName(form.name || 'Unnamed concept')
    validateMutation.mutate({
      concept_name: form.name,
      description: form.description,
      target_market: form.target || undefined,
      run_id: form.runRef || undefined,
    })
    setStage('running')
  }

  const result = validateMutation.data?.result as ValidationResult | undefined

  return (
    <div className="max-w-[760px] mx-auto pb-12">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#A3A3A3] mb-1">AI Intelligence</p>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">Concept Validator</h1>
          <p className="text-[13px] text-[#A3A3A3] mt-1">
            Score a product idea against real market data before you build.
          </p>
        </motion.div>
        {stage !== 'form' && (
          <button
            onClick={() => {
              validateMutation.reset()
              setStage('form')
            }}
            className="btn btn-outline btn-sm"
          >
            New concept
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Form */}
        {stage === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <form onSubmit={submit} className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[rgba(0,0,0,0.06)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">Concept details</p>
              </div>
              <div className="px-5 py-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3] mb-1.5 block">
                      Concept name
                    </label>
                    <input
                      className="input"
                      placeholder="e.g. Ashwagandha Whey Blend"
                      value={form.name}
                      onChange={set('name')}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3] mb-1.5 block">
                      Launch price (INR)
                    </label>
                    <input
                      className="input"
                      placeholder="e.g. 1299"
                      type="number"
                      value={form.price}
                      onChange={set('price')}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3] mb-1.5 block">
                    Description
                  </label>
                  <textarea
                    className="input h-auto py-3 leading-relaxed"
                    rows={3}
                    placeholder="Briefly describe the product, its key differentiators, and the problem it solves."
                    value={form.description}
                    onChange={set('description')}
                    required
                    style={{ resize: 'none', fontFamily: 'inherit' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3] mb-1.5 block">
                      Target customer
                    </label>
                    <input
                      className="input"
                      placeholder="e.g. Urban men 25–38"
                      value={form.target}
                      onChange={set('target')}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3] mb-1.5 block">
                      Compare against run
                    </label>
                    <select className="input" value={form.runRef} onChange={set('runRef')}>
                      <option value="">Latest run (default)</option>
                      <option value="mock-run-001">Whey Protein — Jan 2026</option>
                      <option value="mock-run-002">Whey Protein — May 2026</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-[rgba(0,0,0,0.06)]" style={{ background: '#FAFAFA' }}>
                <button type="submit" className="btn btn-black w-full">
                  Validate concept
                </button>
                <p className="text-[10px] text-[#C8C8C8] text-center mt-2">
                  Takes about 15 seconds · uses live market data from your runs
                </p>
              </div>
            </form>

            {/* Error banner */}
            {validateMutation.isError && (
              <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] px-5 py-4 mt-4">
                <p className="text-[13px] text-[#0A0A0A]">
                  Couldn’t validate concept. {validateMutation.error instanceof Error ? validateMutation.error.message : 'Please try again.'}
                </p>
              </div>
            )}

            {/* Empty state — shown before any validation has been run */}
            {!validateMutation.data && !validateMutation.isError && (!history || history.length === 0) && (
              <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] px-5 py-8 text-center mt-4">
                <p className="text-[13px] text-[#A3A3A3]">Enter a product concept above to validate it against market data.</p>
              </div>
            )}

            {/* Validation history */}
            {history && history.length > 0 && (
              <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden mt-4">
                <div className="px-5 py-3.5 border-b border-[rgba(0,0,0,0.05)]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">Recent validations</p>
                </div>
                <div className="px-5 py-4 divide-y divide-[rgba(0,0,0,0.04)]">
                  {history.map((v: Record<string, unknown>, i: number) => (
                    <div key={(v.id as string) ?? i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-[13px] font-semibold text-[#0A0A0A]">
                          {(v.concept_name as string) ?? (v.conceptName as string) ?? '—'}
                        </p>
                        <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                          {v.created_at ? new Date(v.created_at as string).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <p className="text-[20px] font-bold text-[#0A0A0A]">
                        {(v.score as number) ?? (v.overall_score as number) ?? '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Progress */}
        {stage === 'running' && (
          <motion.div
            key="running"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ValidationProgress onDone={() => {}} />
          </motion.div>
        )}

        {/* Results */}
        {stage === 'results' && result && (
          <motion.div key="results">
            <Results result={result} conceptName={conceptName} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
