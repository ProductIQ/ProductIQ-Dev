// src/components/report/ConceptCard.tsx
import { useState } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, Check } from 'lucide-react'
import { toast } from 'sonner'

export interface ProductConcept {
  rank?: number
  concept_name: string
  tagline?: string | null
  target_persona?: string | null
  suggested_price_inr?: number | null
  validation_score?: number | null
  usp?: string | null
  gap_it_fills?: string | null
  key_features: string[]
  risks: string[]
  name_ideas: string[]
}

interface ConceptCardProps {
  concept: ProductConcept
  index?: number
}

export function ConceptCard({ concept, index = 0 }: ConceptCardProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const score = concept.validation_score ?? 0
  const scoreColor = score > 70 ? '#22C55E' : score > 40 ? '#F59E0B' : '#EF4444'
  const arcLen = 2 * Math.PI * 24
  const offset = arcLen - (score / 100) * arcLen

  async function copyName(name: string) {
    try { await navigator.clipboard.writeText(name) } catch {}
    setCopied(name)
    toast.success(`"${name}" copied to clipboard`)
    setTimeout(() => setCopied(null), 2000)
  }

  const price = concept.suggested_price_inr
    ? `₹${concept.suggested_price_inr.toLocaleString('en-IN')}`
    : '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]">
            Concept {concept.rank ?? index + 1}
          </span>
          <h3 className="text-[18px] font-bold text-[#0A0A0A] mt-0.5">
            {concept.concept_name}
          </h3>
        </div>

        {/* Validation ring */}
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
              transition={{ duration: 0.9, delay: index * 0.1, ease: 'easeOut' }}
              transform="rotate(-90 28 28)"
            />
            <text
              x={28} y={28}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={13} fontWeight="bold"
              fill={scoreColor}
            >
              {score}
            </text>
          </svg>
        </div>
      </div>

      {/* Tagline */}
      {concept.tagline && (
        <p className="text-[13px] text-[#6B6B6B] italic leading-relaxed border-l-4 border-[rgba(0,0,0,0.10)] pl-3 mb-4">
          {concept.tagline}
        </p>
      )}

      {/* Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {concept.target_persona && (
          <span className="text-[11px] bg-[#F8F9FB] border border-[rgba(0,0,0,0.07)] text-[#6B6B6B] px-2.5 py-1 rounded-full">
            <span className="font-semibold text-[#A3A3A3]">Target: </span>{concept.target_persona}
          </span>
        )}
        <span className="text-[11px] bg-[#F8F9FB] border border-[rgba(0,0,0,0.07)] text-[#6B6B6B] px-2.5 py-1 rounded-full">
          <span className="font-semibold text-[#A3A3A3]">Price: </span>{price}
        </span>
        <span className="text-[11px] bg-[#F8F9FB] border border-[rgba(0,0,0,0.07)] text-[#6B6B6B] px-2.5 py-1 rounded-full">
          <span className="font-semibold text-[#A3A3A3]">Score: </span>{score}/100
        </span>
      </div>

      {/* USP + Gap grid */}
      {(concept.usp || concept.gap_it_fills) && (
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {concept.usp && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">USP</p>
              <p className="text-[13px] text-[#444] leading-relaxed">{concept.usp}</p>
            </div>
          )}
          {concept.gap_it_fills && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Gap addressed</p>
              <p className="text-[13px] text-[#444] leading-relaxed">{concept.gap_it_fills}</p>
            </div>
          )}
        </div>
      )}

      {/* Feature tags */}
      {concept.key_features.length > 0 && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">Key features</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {concept.key_features.map(f => (
              <span
                key={f}
                className="text-[11px] bg-[#0F0F0F] text-[#C8F04A] px-2.5 py-0.5 rounded-full font-medium"
              >
                {f}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Risks */}
      {concept.risks.length > 0 && (
        <div className="bg-[#FFF8F8] rounded-xl p-3 mb-4 border border-[rgba(239,68,68,0.10)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#EF4444] mb-2">Risks</p>
          {concept.risks.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px] text-[#EF4444] mb-1 last:mb-0">
              <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />
              {r}
            </div>
          ))}
        </div>
      )}

      {/* Name ideas */}
      {concept.name_ideas.length > 0 && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">
            Name ideas — click to copy
          </p>
          <div className="flex flex-wrap gap-1.5">
            {concept.name_ideas.map(n => (
              <button
                key={n}
                onClick={() => copyName(n)}
                className="text-[11px] bg-[#F8F9FB] border border-[rgba(0,0,0,0.10)] text-[#6B6B6B] px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all duration-150 hover:bg-[#0F0F0F] hover:text-[#C8F04A] hover:border-transparent"
              >
                {copied === n ? <><Check size={9} className="text-[#22C55E]" /> Copied</> : n}
              </button>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
