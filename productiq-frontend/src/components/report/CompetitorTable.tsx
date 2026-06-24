// src/components/report/CompetitorTable.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { formatINR } from '@/lib/utils'

export interface CompetitorRow {
  id?: string
  brand_name: string
  product_name?: string | null
  platform?: string | null
  price_inr?: number | null
  rating?: number | null
  review_count?: number | null
  key_strengths?: string[]
  key_weaknesses?: string[]
  positioning_statement?: string | null
}

type SortKey = 'brand_name' | 'price_inr' | 'rating' | 'review_count'
type SortDir = 'asc' | 'desc'

interface CompetitorTableProps {
  competitors: CompetitorRow[]
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="font-mono text-[13px] text-[#0A0A0A]">
      {value.toFixed(1)}{' '}
      <span className="text-[#F59E0B] text-[11px]">★</span>
    </span>
  )
}

export function CompetitorTable({ competitors }: CompetitorTableProps) {
  const [sortKey, setSortKey]   = useState<SortKey>('rating')
  const [sortDir, setSortDir]   = useState<SortDir>('desc')
  const [expanded, setExpanded] = useState<string | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...competitors].sort((a, b) => {
    const av = a[sortKey] ?? 0
    const bv = b[sortKey] ?? 0
    if (typeof av === 'string' && typeof bv === 'string')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="opacity-20 ml-1">↕</span>
    return sortDir === 'asc'
      ? <ArrowUp size={10} className="inline ml-1 opacity-60" />
      : <ArrowDown size={10} className="inline ml-1 opacity-60" />
  }

  const COLS: { key: SortKey; label: string; align?: string }[] = [
    { key: 'brand_name',   label: 'Brand'   },
    { key: 'price_inr',   label: 'Price',   align: 'text-right' },
    { key: 'rating',      label: 'Rating'   },
    { key: 'review_count', label: 'Reviews' },
  ]

  return (
    <div className="bg-white rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.07)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr
              className="text-[10px] uppercase tracking-wider text-[#A3A3A3] border-b border-[rgba(0,0,0,0.05)]"
              style={{ background: '#F8F9FB' }}
            >
              {COLS.map(col => (
                <th
                  key={col.key}
                  className={`px-5 py-3 font-semibold cursor-pointer select-none hover:text-[#0A0A0A] transition-colors ${col.align ?? ''}`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </th>
              ))}
              <th className="px-5 py-3 font-semibold hidden md:table-cell">Strength</th>
              <th className="px-5 py-3 font-semibold hidden md:table-cell">Gap</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((comp, i) => {
              const key = comp.id ?? comp.brand_name
              const isOpen = expanded === key
              return (
                <>
                  <tr
                    key={key}
                    onClick={() => setExpanded(isOpen ? null : key)}
                    className="border-b border-[rgba(0,0,0,0.04)] cursor-pointer hover:bg-[#F8F9FB] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="text-[13px] font-semibold text-[#0A0A0A]">
                        {comp.brand_name}
                      </div>
                      {comp.product_name && (
                        <div className="text-[11px] text-[#A3A3A3] truncate max-w-[180px]">
                          {comp.product_name}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[13px] text-[#0A0A0A] text-right">
                      {formatINR(comp.price_inr)}
                    </td>
                    <td className="px-5 py-3.5">
                      {comp.rating != null ? <StarRating value={comp.rating} /> : <span className="text-[#A3A3A3]">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-[#6B6B6B]">
                      {comp.review_count != null
                        ? comp.review_count.toLocaleString('en-IN')
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-[#6B6B6B] hidden md:table-cell max-w-[180px]">
                      {comp.key_strengths?.[0] ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-[#EF4444] hidden md:table-cell max-w-[180px]">
                      {comp.key_weaknesses?.[0] ?? '—'}
                    </td>
                  </tr>

                  <AnimatePresence>
                    {isOpen && (
                      <tr key={`${key}-exp`}>
                        <td colSpan={6} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 py-4 bg-[#F8F9FB] border-b border-[rgba(0,0,0,0.05)]">
                              <div className="grid md:grid-cols-3 gap-4">
                                {/* Strengths */}
                                {(comp.key_strengths?.length ?? 0) > 0 && (
                                  <div>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">
                                      Strengths
                                    </p>
                                    <ul className="space-y-1">
                                      {comp.key_strengths!.map((s, si) => (
                                        <li key={si} className="text-[12px] text-[#444] flex items-start gap-1.5">
                                          <span className="text-[#22C55E] mt-0.5">+</span> {s}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Weaknesses */}
                                {(comp.key_weaknesses?.length ?? 0) > 0 && (
                                  <div>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#EF4444] mb-2">
                                      Weaknesses
                                    </p>
                                    <ul className="space-y-1">
                                      {comp.key_weaknesses!.map((w, wi) => (
                                        <li key={wi} className="text-[12px] text-[#444] flex items-start gap-1.5">
                                          <span className="text-[#EF4444] mt-0.5">−</span> {w}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Positioning */}
                                {comp.positioning_statement && (
                                  <div>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">
                                      Positioning
                                    </p>
                                    <p className="text-[12px] text-[#6B6B6B] italic leading-relaxed">
                                      {comp.positioning_statement}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {competitors.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-[13px] font-semibold text-[#0A0A0A]">No competitors mapped</p>
          <p className="text-[12px] text-[#A3A3A3] mt-1">
            Competitor data will appear once the analysis completes.
          </p>
        </div>
      )}
    </div>
  )
}
