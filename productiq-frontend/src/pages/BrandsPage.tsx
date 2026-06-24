// src/pages/BrandsPage.tsx
// Brand Profiles — monitoring configuration hub.
// Design: exact same patterns as Dashboard — white card, dark strip, RunRow-style rows.

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Settings2, Play, TrendingUp, TrendingDown,
  ArrowRight, ChevronRight, X, Check,
} from 'lucide-react'
import { MOCK_BRANDS, type BrandProfile } from '@/lib/mockData'
import { cn } from '@/lib/utils'

// ── Mini sparkline — same as Dashboard ──────────────────────────────────────
function Sparkline({ data, color = '#0A0A0A', height = 24 }: { data: number[]; color?: string; height?: number }) {
  const max  = Math.max(...data)
  const min  = Math.min(...data)
  const rng  = max - min || 1
  const W    = 64
  const step = W / (data.length - 1)
  const pts  = data.map((v, i) => [i * step, height - ((v - min) / rng) * (height - 4) - 2])
  const d    = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  return (
    <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Health score — inline number + delta, no ring ────────────────────────────
function HealthScore({ score, delta }: { score: number; delta: number }) {
  const isUp    = delta >= 0
  const scoreVal = Math.round(score * 100)
  const color   = score > 0.6 ? '#22C55E' : score > 0.3 ? '#F59E0B' : '#EF4444'
  return (
    <div className="text-right flex-shrink-0">
      <div className="text-[22px] font-bold tracking-tight leading-none" style={{ color }}>{scoreVal}</div>
      <div className="flex items-center justify-end gap-0.5 mt-0.5">
        {isUp ? <TrendingUp size={9} className="text-[#22C55E]" /> : <TrendingDown size={9} className="text-[#EF4444]" />}
        <span className="text-[10px] font-semibold" style={{ color: isUp ? '#22C55E' : '#EF4444' }}>
          {isUp ? '+' : ''}{(delta * 100).toFixed(0)}%
        </span>
      </div>
      <div className="text-[9px] text-[#A3A3A3] mt-0.5 uppercase tracking-wider">Health</div>
    </div>
  )
}

// ── Brand card — styled like RunRow but as a card ────────────────────────────
function BrandCard({ brand, onEdit }: { brand: BrandProfile; onEdit: (b: BrandProfile) => void }) {
  const navigate = useNavigate()
  const trendColor = brand.healthScore > 0.6 ? '#22C55E' : brand.healthScore > 0.3 ? '#F59E0B' : '#EF4444'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden"
    >
      {/* Card header */}
      <div className="flex items-start gap-4 px-5 pt-5 pb-4">
        {/* Monogram */}
        <div
          className="w-10 h-10 rounded-[14px] flex items-center justify-center text-[12px] font-black flex-shrink-0"
          style={{ background: '#0F0F0F', color: '#C8F04A' }}
        >
          {brand.brandName.substring(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[14px] font-bold text-[#0A0A0A] truncate">{brand.brandName}</h3>
            <span
              className="flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase"
              style={{ color: brand.monitoringEnabled ? '#22C55E' : '#A3A3A3' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: brand.monitoringEnabled ? '#22C55E' : '#D1D5DB',
                  animation: brand.monitoringEnabled ? 'pulse 2s infinite' : 'none',
                }}
              />
              {brand.monitoringEnabled ? 'Live' : 'Paused'}
            </span>
          </div>
          <p className="text-[12px] text-[#6B6B6B] truncate">{brand.productCategory}</p>
          <p className="text-[10px] text-[#A3A3A3] mt-0.5">{brand.targetMarket}</p>
        </div>

        <HealthScore score={brand.healthScore} delta={brand.healthDelta} />
      </div>

      {/* Sparklines — 2 col, same pattern as BrandHealthCard */}
      <div className="flex border-t border-[rgba(0,0,0,0.05)]">
        <div className="flex-1 px-5 py-3 border-r border-[rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3]">Sentiment</span>
            <span className="text-[10px] font-semibold" style={{ color: trendColor }}>
              {brand.sentimentTrend[brand.sentimentTrend.length - 1].toFixed(2)}
            </span>
          </div>
          <Sparkline data={brand.sentimentTrend} color={trendColor} />
        </div>
        <div className="flex-1 px-5 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3]">Avg price</span>
            <span className="text-[10px] font-semibold text-[#0A0A0A]">
              ₹{brand.priceTrend[brand.priceTrend.length - 1].toLocaleString('en-IN')}
            </span>
          </div>
          <Sparkline data={brand.priceTrend} color="#0A0A0A" />
        </div>
      </div>

      {/* Stats row — same typographic pattern as Dashboard StatCard */}
      <div className="flex border-t border-[rgba(0,0,0,0.05)]">
        {[
          { value: brand.totalRuns,          label: 'Runs' },
          { value: brand.totalInsights,      label: 'Insights' },
          { value: brand.competitors.length, label: 'Competitors' },
        ].map(({ value, label }, i, arr) => (
          <div
            key={label}
            className={cn(
              'flex-1 px-4 py-3 text-center',
              i < arr.length - 1 && 'border-r border-[rgba(0,0,0,0.05)]',
            )}
          >
            <div className="text-[18px] font-bold text-[#0A0A0A] leading-none">{value}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-[#A3A3A3] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Competitor tags */}
      <div className="px-5 py-3 border-t border-[rgba(0,0,0,0.05)]">
        <p className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">Tracking</p>
        <div className="flex flex-wrap gap-1.5">
          {brand.competitors.map(c => (
            <span
              key={c}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.05)', color: '#6B6B6B' }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-5 py-3.5 border-t border-[rgba(0,0,0,0.05)]" style={{ background: '#FAFAFA' }}>
        <button
          onClick={() => navigate('/reports/new')}
          className="btn btn-black btn-sm flex-1"
        >
          Run Report
        </button>
        <button
          onClick={() => onEdit(brand)}
          className="btn btn-outline btn-sm flex items-center gap-1.5"
        >
          <Settings2 size={11} /> Configure
        </button>
      </div>
    </motion.div>
  )
}

// ── Add Brand modal — 2-step wizard ─────────────────────────────────────────
function AddBrandModal({ onClose, onAdd }: { onClose: () => void; onAdd: (b: Partial<BrandProfile>) => void }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    brandName: '', productCategory: '',
    targetMarket: 'India — Pan India D2C', competitors: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleAdd = () => {
    onAdd({ ...form, competitors: form.competitors.split(',').map(c => c.trim()).filter(Boolean) })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="bg-white rounded-[24px] p-7 w-full max-w-[420px] shadow-2xl"
      >
        {/* Modal header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-[16px] font-bold text-[#0A0A0A]">Add brand profile</h2>
            <p className="text-[12px] text-[#A3A3A3] mt-0.5">Step {step} of 2</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F0F2F5] transition-colors">
            <X size={14} className="text-[#6B6B6B]" />
          </button>
        </div>

        {/* Step progress */}
        <div className="flex gap-1.5 mb-6">
          {[1, 2].map(s => (
            <div key={s} className="h-0.5 flex-1 rounded-full transition-all duration-300"
              style={{ background: step >= s ? '#0A0A0A' : '#E5E7EB' }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3] mb-1.5 block">Brand name</label>
                <input className="input" placeholder="e.g. NutriMax" value={form.brandName} onChange={set('brandName')} />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3] mb-1.5 block">Product category</label>
                <input className="input" placeholder="e.g. Whey Protein, Face Serum" value={form.productCategory} onChange={set('productCategory')} />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3] mb-1.5 block">Target market</label>
                <select className="input" value={form.targetMarket} onChange={set('targetMarket')}>
                  <option>India — Pan India D2C</option>
                  <option>India — Tier 1 &amp; 2</option>
                  <option>India — Tier 2 &amp; 3</option>
                  <option>India — Metro only</option>
                </select>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!form.brandName || !form.productCategory}
                className="btn btn-black w-full"
              >
                Continue
              </button>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3] mb-1.5 block">Top competitors (comma-separated)</label>
                <input className="input" placeholder="e.g. MuscleBlaze, MyProtein" value={form.competitors} onChange={set('competitors')} />
                <p className="text-[11px] text-[#A3A3A3] mt-1.5">Agents will track these for price changes, launches, and sentiment shifts.</p>
              </div>
              <div className="rounded-[14px] border border-[rgba(0,0,0,0.07)] p-4 space-y-2">
                <p className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-wider mb-2.5">Monitoring included</p>
                {[
                  'Brand sentiment score · daily',
                  'Competitor price tracking · daily',
                  'Brand mention alerts · every 4h',
                  'Competitor launch detection · every 6h',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-[12px] text-[#6B6B6B]">
                    <Check size={10} className="text-[#0A0A0A] flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="btn btn-outline flex-1">Back</button>
                <button onClick={handleAdd} disabled={!form.competitors} className="btn btn-black flex-1">Add brand</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ── Alert config modal ───────────────────────────────────────────────────────
function ConfigModal({ brand, onClose }: { brand: BrandProfile; onClose: () => void }) {
  const [t, setT] = useState(brand.alertThresholds)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setT(prev => ({ ...prev, [k]: Number(e.target.value) }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="bg-white rounded-[24px] p-7 w-full max-w-[420px] shadow-2xl"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-[16px] font-bold text-[#0A0A0A]">{brand.brandName}</h2>
            <p className="text-[12px] text-[#A3A3A3] mt-0.5">Alert thresholds</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F0F2F5] transition-colors">
            <X size={14} className="text-[#6B6B6B]" />
          </button>
        </div>

        <div className="space-y-6">
          {[
            { key: 'sentimentDrop', label: 'Sentiment drop', unit: 'pts in 24h',  min: 1, max: 30 },
            { key: 'priceChange',   label: 'Price change',   unit: '% delta',     min: 1, max: 30 },
            { key: 'mentionSpike',  label: 'Mention spike',  unit: 'mentions/2h', min: 5, max: 200 },
          ].map(({ key, label, unit, min, max }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-[#0A0A0A]">{label}</span>
                <span className="text-[13px] font-mono font-semibold text-[#0A0A0A]">
                  {t[key as keyof typeof t]} {unit}
                </span>
              </div>
              <input
                type="range" min={min} max={max}
                value={t[key as keyof typeof t]}
                onChange={set(key)}
                className="w-full accent-[#0A0A0A] h-0.5"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-7">
          <button onClick={onClose} className="btn btn-outline flex-1">Cancel</button>
          <button onClick={onClose} className="btn btn-black flex-1">Save</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export function BrandsPage() {
  const [brands, setBrands]       = useState<BrandProfile[]>(MOCK_BRANDS)
  const [showAdd, setShowAdd]     = useState(false)
  const [editBrand, setEditBrand] = useState<BrandProfile | null>(null)

  const addBrand = (partial: Partial<BrandProfile>) => {
    setBrands(prev => [{
      id: `brand-${Date.now()}`,
      brandName: partial.brandName ?? 'New Brand',
      productCategory: partial.productCategory ?? '',
      targetMarket: partial.targetMarket ?? 'India',
      monitoringEnabled: true,
      trackingSince: new Date().toISOString(),
      lastFullRunAt: '',
      healthScore: 0.5,
      healthDelta: 0,
      sentimentTrend: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      priceTrend: [500, 500, 500, 500, 500, 500, 500],
      competitors: Array.isArray(partial.competitors) ? partial.competitors : [],
      alertThresholds: { sentimentDrop: 10, priceChange: 8, mentionSpike: 50 },
      plan: 'starter',
      totalRuns: 0,
      totalInsights: 0,
    }, ...prev])
  }

  const active = brands.filter(b => b.monitoringEnabled).length

  return (
    <div className="max-w-[1080px] mx-auto pb-12">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#A3A3A3] mb-1">Monitoring</p>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">Brand Profiles</h1>
          <p className="text-[13px] text-[#A3A3A3] mt-1">
            {brands.length} brands · {active} actively monitored
          </p>
        </motion.div>
        <motion.button
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setShowAdd(true)}
          className="btn btn-black flex items-center gap-2"
        >
          <Plus size={14} /> Add brand
        </motion.button>
      </div>

      {/* ── Monitoring status strip — same as insight strip on dashboard ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="rounded-[20px] overflow-hidden mb-6"
        style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="px-5 py-2.5 flex items-center gap-2 border-b border-white/5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C8F04A] animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Monitoring Active</span>
        </div>
        <div className="flex overflow-x-auto scrollbar-none divide-x divide-white/5">
          {[
            { label: 'Sentiment',    value: 'Daily 7am IST' },
            { label: 'Prices',       value: 'Daily 8am IST' },
            { label: 'Brand mentions', value: 'Every 4h' },
            { label: 'Competitor scans', value: 'Every 6h' },
          ].map(({ label, value }) => (
            <div key={label} className="flex-shrink-0 px-5 py-3 min-w-[160px]">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 mb-0.5">{label}</p>
              <p className="text-[12px] font-semibold text-white/70">{value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Brand cards grid ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        <AnimatePresence>
          {brands.map((brand, i) => (
            <motion.div
              key={brand.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ delay: i * 0.05 }}
            >
              <BrandCard brand={brand} onEdit={setEditBrand} />
            </motion.div>
          ))}

          {/* Add placeholder */}
          <motion.button
            key="add-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: brands.length * 0.05 }}
            onClick={() => setShowAdd(true)}
            className="bg-white rounded-[20px] border border-dashed border-[rgba(0,0,0,0.12)] flex flex-col items-center justify-center min-h-[240px] gap-2.5 group hover:border-[rgba(0,0,0,0.3)] transition-all"
          >
            <div className="w-9 h-9 rounded-[12px] bg-[#F0F2F5] group-hover:bg-[#0F0F0F] flex items-center justify-center transition-all">
              <Plus size={16} className="text-[#A3A3A3] group-hover:text-[#C8F04A] transition-all" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-[#6B6B6B] group-hover:text-[#0A0A0A] transition-colors">Add a brand</p>
              <p className="text-[11px] text-[#A3A3A3] mt-0.5">Start monitoring in 2 steps</p>
            </div>
          </motion.button>
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showAdd && <AddBrandModal onClose={() => setShowAdd(false)} onAdd={addBrand} />}
        {editBrand && <ConfigModal brand={editBrand} onClose={() => setEditBrand(null)} />}
      </AnimatePresence>
    </div>
  )
}
