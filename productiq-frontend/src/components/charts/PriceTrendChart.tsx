// src/components/charts/PriceTrendChart.tsx
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'

interface PriceDataPoint {
  date: string
  amazon?: number
  flipkart?: number
  meesho?: number
}

interface PriceTrendChartProps {
  data: PriceDataPoint[]
  optimalPrice?: number
  height?: number
}

function formatINR(v: number) {
  return '₹' + v.toLocaleString('en-IN')
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-3 min-w-[140px]">
      <p className="text-[11px] font-semibold text-[#A3A3A3] mb-2">{formatDate(label)}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4 text-[12px]">
          <span className="capitalize text-[#6B6B6B]">{p.dataKey}</span>
          <span className="font-semibold text-[#0A0A0A]">{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function PriceTrendChart({ data, optimalPrice, height = 260 }: PriceTrendChartProps) {
  const hasAmazon   = data.some(d => d.amazon !== undefined)
  const hasFlipkart = data.some(d => d.flipkart !== undefined)
  const hasMeesho   = data.some(d => d.meesho !== undefined)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="amazonGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C8F04A" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#C8F04A" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="flipkartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F97316" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#F97316" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="meeshoGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A855F7" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#A855F7" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: '#A3A3A3' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatINR}
          tick={{ fontSize: 11, fill: '#A3A3A3' }}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: 12 }}
          formatter={(v) => <span className="text-[12px] text-[#6B6B6B] capitalize">{v}</span>}
        />

        {optimalPrice && (
          <ReferenceLine
            y={optimalPrice}
            stroke="#0A0A0A"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{ value: `Optimal ${formatINR(optimalPrice)}`, fill: '#0A0A0A', fontSize: 11, position: 'insideTopRight' }}
          />
        )}

        {hasAmazon && (
          <Area
            type="monotone" dataKey="amazon"
            stroke="#5A8A00" strokeWidth={2.5}
            fill="url(#amazonGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#5A8A00' }}
            isAnimationActive animationDuration={800}
          />
        )}
        {hasFlipkart && (
          <Area
            type="monotone" dataKey="flipkart"
            stroke="#F97316" strokeWidth={2}
            fill="url(#flipkartGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#F97316' }}
            isAnimationActive animationDuration={900}
          />
        )}
        {hasMeesho && (
          <Area
            type="monotone" dataKey="meesho"
            stroke="#A855F7" strokeWidth={2}
            fill="url(#meeshoGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#A855F7' }}
            isAnimationActive animationDuration={1000}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
