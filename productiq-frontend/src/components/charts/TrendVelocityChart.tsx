// src/components/charts/TrendVelocityChart.tsx
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

type ChartMode = 'sentiment' | 'trend'

interface TrendVelocityChartProps {
  data: Array<Record<string, any>>
  mode?: ChartMode
  height?: number
  keys?: string[]        // for trend mode: keyword names
}

const COLORS = ['#5A8A00', '#F97316', '#A855F7', '#0EA5E9', '#EF4444', '#EAB308']

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

const SentimentTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value as number
  const color = v > 0.2 ? '#22C55E' : v < -0.2 ? '#EF4444' : '#A3A3A3'
  return (
    <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-3">
      <p className="text-[11px] font-semibold text-[#A3A3A3] mb-1">{formatDate(label)}</p>
      <p className="text-[14px] font-bold" style={{ color }}>
        {v >= 0 ? '+' : ''}{v.toFixed(2)}
      </p>
    </div>
  )
}

const TrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-3 min-w-[150px]">
      <p className="text-[11px] font-semibold text-[#A3A3A3] mb-2">{formatDate(label)}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-4 text-[12px]">
          <span className="text-[#6B6B6B]">{p.dataKey}</span>
          <span className="font-semibold text-[#0A0A0A]">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function TrendVelocityChart({ data, mode = 'sentiment', height = 200, keys = [] }: TrendVelocityChartProps) {
  const isSentiment = mode === 'sentiment'

  if (isSentiment) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sentGradPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="sentGradNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.02} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0.25} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: '#A3A3A3' }}
            axisLine={false}
            tickLine={false}
            tickCount={6}
          />
          <YAxis
            domain={[-1, 1]}
            ticks={[-1, -0.5, 0, 0.5, 1]}
            tick={{ fontSize: 11, fill: '#A3A3A3' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <ReferenceLine y={0} stroke="rgba(0,0,0,0.15)" strokeWidth={1.5} />
          <Tooltip content={<SentimentTooltip />} />

          <Area
            type="monotone"
            dataKey="score"
            stroke="#16A34A"
            strokeWidth={2.5}
            fill="url(#sentGradPos)"
            dot={false}
            activeDot={{ r: 4, fill: '#16A34A' }}
            isAnimationActive
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: '#A3A3A3' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tick={{ fontSize: 11, fill: '#A3A3A3' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<TrendTooltip />} />

        {keys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive
            animationDuration={800 + i * 100}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
