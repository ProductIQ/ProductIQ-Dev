// src/pages/PriceTrackerPage.tsx
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Target, ArrowUp, ArrowDown, Minus, Activity, X,
  TrendingUp, SlidersHorizontal, ChevronUp, ChevronDown,
} from 'lucide-react'
import { PriceTrendChart } from '@/components/charts/PriceTrendChart'

// ── Mock Data ─────────────────────────────────────────────────────
type Platform = 'All' | 'Amazon' | 'Flipkart' | 'Meesho'

const PRICE_DATA = [
  { id: '1', name: 'MuscleBlaze Whey Protein 1kg',      brand: 'MuscleBlaze',    amazon: 2199, flipkart: 2149, meesho: 1999, mrp: 2799, rating: 4.2, reviews: 12840, change24h: -2.1 },
  { id: '2', name: 'Optimum Nutrition Gold Standard',    brand: 'ON',             amazon: 4299, flipkart: 4399, meesho: null, mrp: 5499, rating: 4.6, reviews: 8421,  change24h: +0.8 },
  { id: '3', name: 'MyProtein Impact Whey 1kg',          brand: 'MyProtein',      amazon: 1799, flipkart: 1749, meesho: 1699, mrp: 2499, rating: 4.0, reviews: 6523,  change24h: -0.5 },
  { id: '4', name: 'Nakpro Gold Whey 1kg',               brand: 'Nakpro',         amazon: 1499, flipkart: 1459, meesho: 1399, mrp: 1999, rating: 3.8, reviews: 2100,  change24h: +1.5 },
  { id: '5', name: 'HK Vitals Whey Protein 1kg',         brand: 'HK Vitals',      amazon: 1299, flipkart: 1249, meesho: 1199, mrp: 1799, rating: 3.7, reviews: 4210,  change24h: 0 },
  { id: '6', name: 'Dymatize Elite Whey 907g',           brand: 'Dymatize',       amazon: 3299, flipkart: null, meesho: null, mrp: 4199, rating: 4.4, reviews: 3122,  change24h: -1.2 },
  { id: '7', name: 'Scitron Advance Whey 1kg',           brand: 'Scitron',        amazon: 2599, flipkart: 2549, meesho: 2399, mrp: 3299, rating: 4.1, reviews: 5541,  change24h: +3.2 },
]

// Generate 90-day price history mock for a product
function generateHistory(productId: string) {
  const base = { '1': 2100, '2': 4200, '3': 1700, '4': 1450, '5': 1280, '6': 3350, '7': 2500 }[productId] ?? 2000
  const now = Date.now()
  return Array.from({ length: 30 }, (_, i) => ({
    date: new Date(now - (29 - i) * 86400000).toISOString(),
    amazon:   Math.round(base + Math.sin(i * 0.6) * 120),
    flipkart: Math.round(base - 40 + Math.sin(i * 0.4 + 1) * 100),
  }))
}

function formatINR(v: number) {
  return '₹' + v.toLocaleString('en-IN')
}

type SortKey = 'name' | 'amazon' | 'flipkart' | 'rating' | 'change24h' | 'discount'
type SortDir = 'asc' | 'desc'

export function PriceTrackerPage() {
  const [platform, setPlatform] = useState<Platform>('All')
  const [sortKey, setSortKey]   = useState<SortKey>('amazon')
  const [sortDir, setSortDir]   = useState<SortDir>('asc')
  const [selected, setSelected] = useState<typeof PRICE_DATA[0] | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    return [...PRICE_DATA].sort((a, b) => {
      let va: number, vb: number
      if (sortKey === 'name') {
        return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      }
      if (sortKey === 'amazon')   { va = a.amazon ?? 0;   vb = b.amazon ?? 0 }
      else if (sortKey === 'flipkart') { va = a.flipkart ?? 0; vb = b.flipkart ?? 0 }
      else if (sortKey === 'rating')   { va = a.rating;   vb = b.rating }
      else if (sortKey === 'change24h') { va = a.change24h; vb = b.change24h }
      else {
        va = Math.round(((a.mrp - (a.amazon ?? a.mrp)) / a.mrp) * 100)
        vb = Math.round(((b.mrp - (b.amazon ?? b.mrp)) / b.mrp) * 100)
      }
      return sortDir === 'asc' ? va - vb : vb - va
    })
  }, [sortKey, sortDir])

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="opacity-20 text-[10px]">↕</span>
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-[#0A0A0A]" />
      : <ChevronDown size={12} className="text-[#0A0A0A]" />
  }

  // Find optimal price
  const allPrices = PRICE_DATA.flatMap(p => [p.amazon, p.flipkart, p.meesho].filter(Boolean) as number[])
  const optimalPrice = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length * 1.08)

  return (
    <div className="max-w-[1080px] mx-auto pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono bg-[#0F0F0F] text-[#C8F04A] px-2 py-0.5 rounded uppercase tracking-wider">Agent 10</span>
            <span className="text-[12px] font-semibold tracking-[0.1em] uppercase text-[#A3A3A3]">Price Intelligence</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">Price Optimizer</h1>
        </motion.div>

        {/* Platform filter */}
        <motion.div
          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <SlidersHorizontal size={13} className="text-[#A3A3A3]" />
          {(['All', 'Amazon', 'Flipkart', 'Meesho'] as Platform[]).map(p => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-full transition-all duration-150 ${
                platform === p
                  ? 'bg-[#0A0A0A] text-white'
                  : 'bg-white border border-[rgba(0,0,0,0.1)] text-[#6B6B6B] hover:border-[rgba(0,0,0,0.2)]'
              }`}
            >
              {p}
            </button>
          ))}
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Main Table ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Price table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="bg-white rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.07)]"
          >
            <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[#0A0A0A]">Market Price Map</h3>
              <span className="text-[11px] text-[#A3A3A3]">Updated 2h ago</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F8F9FB] text-[11px] uppercase tracking-wider text-[#A3A3A3] border-b border-[rgba(0,0,0,0.05)]">
                    {[
                      { k: 'name' as SortKey,     label: 'Product' },
                      { k: 'amazon' as SortKey,   label: 'Amazon' },
                      { k: 'flipkart' as SortKey, label: 'Flipkart' },
                      { k: 'discount' as SortKey, label: 'Disc %' },
                      { k: 'change24h' as SortKey, label: '24h Δ' },
                      { k: 'rating' as SortKey,   label: 'Rating' },
                    ].map(col => (
                      <th
                        key={col.k}
                        className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-[#0A0A0A] transition-colors"
                        onClick={() => handleSort(col.k)}
                      >
                        <span className="flex items-center gap-1">{col.label} <SortIcon k={col.k} /></span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => {
                    const discPct = row.amazon ? Math.round(((row.mrp - row.amazon) / row.mrp) * 100) : 0
                    const isActive = selected?.id === row.id
                    return (
                      <motion.tr
                        key={row.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.04 * i }}
                        onClick={() => setSelected(isActive ? null : row)}
                        className={`border-b border-[rgba(0,0,0,0.04)] cursor-pointer transition-colors duration-100 ${
                          isActive ? 'bg-[rgba(200,240,74,0.08)]' : 'hover:bg-[#F8F9FB]'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="text-[13px] font-semibold text-[#0A0A0A] max-w-[200px] truncate">{row.name}</div>
                          <div className="text-[11px] text-[#A3A3A3]">{row.brand}</div>
                        </td>
                        <td className="px-4 py-3 text-[13px] font-mono text-[#0A0A0A]">
                          {row.amazon ? formatINR(row.amazon) : <span className="text-[#A3A3A3]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-mono text-[#6B6B6B]">
                          {row.flipkart ? formatINR(row.flipkart) : <span className="text-[#A3A3A3]">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            discPct > 20 ? 'bg-[#dcfce7] text-[#16A34A]' :
                            discPct > 10 ? 'bg-[#FEF3C7] text-[#B45309]' :
                            'bg-[rgba(0,0,0,0.05)] text-[#A3A3A3]'
                          }`}>
                            {discPct}% off
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.change24h === 0 ? (
                            <span className="flex items-center gap-0.5 text-[12px] font-semibold text-[#A3A3A3]">
                              <Minus size={11} /> 0%
                            </span>
                          ) : row.change24h > 0 ? (
                            <span className="flex items-center gap-0.5 text-[12px] font-semibold text-[#EF4444]">
                              <ArrowUp size={11} /> +{row.change24h}%
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-[12px] font-semibold text-[#22C55E]">
                              <ArrowDown size={11} /> {row.change24h}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#6B6B6B]">
                          ⭐ {row.rating} <span className="text-[11px] text-[#A3A3A3]">({row.reviews.toLocaleString()})</span>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* ── Product Detail Slide-up ── */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]"
              >
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-[15px] font-bold text-[#0A0A0A]">{selected.name}</h3>
                    <p className="text-[12px] text-[#A3A3A3] mt-0.5">90-day price history · {selected.brand}</p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-8 h-8 rounded-full border border-[rgba(0,0,0,0.1)] flex items-center justify-center text-[#A3A3A3] hover:text-[#0A0A0A] hover:border-[rgba(0,0,0,0.2)] transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>

                <PriceTrendChart
                  data={generateHistory(selected.id)}
                  optimalPrice={optimalPrice}
                  height={220}
                />

                {/* Platform comparison mini-table */}
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Amazon',   price: selected.amazon,   lowest: selected.amazon === Math.min(...[selected.amazon, selected.flipkart, selected.meesho].filter(Boolean) as number[]) },
                    { label: 'Flipkart', price: selected.flipkart, lowest: selected.flipkart === Math.min(...[selected.amazon, selected.flipkart, selected.meesho].filter(Boolean) as number[]) },
                    { label: 'Meesho',   price: selected.meesho,   lowest: selected.meesho === Math.min(...[selected.amazon, selected.flipkart, selected.meesho].filter(Boolean) as number[]) },
                  ].map(p => (
                    <div key={p.label} className={`rounded-xl p-3 border ${p.lowest && p.price ? 'bg-[#dcfce7] border-[rgba(34,197,94,0.2)]' : 'bg-[#F8F9FB] border-[rgba(0,0,0,0.06)]'}`}>
                      <p className="text-[11px] font-semibold text-[#A3A3A3] mb-1">{p.label}</p>
                      <p className="text-[16px] font-bold text-[#0A0A0A]">
                        {p.price ? formatINR(p.price) : <span className="text-[#A3A3A3] text-[13px]">Not listed</span>}
                      </p>
                      {p.lowest && p.price && <p className="text-[10px] font-bold text-[#16A34A] mt-0.5">Lowest price</p>}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right Col: Optimization Panel ── */}
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}
            className="rounded-[20px] p-6 text-white relative overflow-hidden" style={{ background: '#0F0F0F' }}
          >
            <div className="relative z-10">
              <h3 className="text-[13px] font-semibold mb-5 flex items-center gap-2">
                <Target size={14} className="text-[#C8F04A]" /> Optimization Target
              </h3>
              <div className="mb-5">
                <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1">Recommended MSRP</div>
                <div className="text-[38px] font-black tracking-tight" style={{ color: '#C8F04A' }}>
                  {formatINR(optimalPrice)}
                </div>
              </div>
              <div className="border-t border-white/10 pt-4 mb-5">
                <p className="text-[13px] leading-[1.65] text-white/75">
                  At current market conditions, this price represents the elasticity peak — 8% above the category average while remaining competitive with top-rated alternatives.
                </p>
              </div>

              {/* Price sensitivity */}
              <div className="flex items-center justify-between text-[12px] mb-4">
                <span className="text-white/50">Price Sensitivity</span>
                <span className="font-semibold text-[#C8F04A]">Medium</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-5">
                <div className="h-full bg-[#C8F04A] rounded-full" style={{ width: '55%' }} />
              </div>

              <button className="btn btn-lime btn-sm w-full">Apply Recommendation</button>
            </div>
            <Activity size={110} className="absolute -bottom-8 -right-8 text-white/[0.04]" />
          </motion.div>

          {/* Stats mini cards */}
          <motion.div
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}
            className="bg-white rounded-[20px] p-5 border border-[rgba(0,0,0,0.07)]"
          >
            <h3 className="text-[13px] font-bold text-[#0A0A0A] mb-4 flex items-center gap-2">
              <TrendingUp size={13} className="text-[#A3A3A3]" /> Market Overview
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Cheapest competitor',  value: formatINR(1299), color: '#22C55E' },
                { label: 'Category avg price',   value: formatINR(2314), color: '#0A0A0A' },
                { label: 'Premium ceiling',      value: formatINR(4399), color: '#A3A3A3' },
                { label: 'Your market position', value: 'Mid-range',     color: '#F59E0B' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-[13px]">
                  <span className="text-[#A3A3A3]">{item.label}</span>
                  <span className="font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
