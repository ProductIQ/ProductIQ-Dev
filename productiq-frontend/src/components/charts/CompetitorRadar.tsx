// src/components/charts/CompetitorRadar.tsx
import {
  RadarChart, PolarGrid, PolarAngleAxis,
  Radar, Legend, ResponsiveContainer, Tooltip,
} from 'recharts'

const AXIS_LABELS = [
  'Price positioning',
  'Rating quality',
  'Review volume',
  'Feature breadth',
  'Marketing reach',
]

/** Pass raw competitor data; normalization is done inside */
export interface RadarCompetitor {
  name: string
  price_inr?: number | null
  rating?: number | null
  review_count?: number | null
  feature_count?: number | null
  marketing_score?: number | null
}

const PALETTE = ['#0A0A0A', '#C8F04A', '#22C55E', '#F59E0B', '#0EA5E9', '#EF4444']

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50
  return Math.round(((value - min) / (max - min)) * 100)
}

interface CompetitorRadarProps {
  competitors: RadarCompetitor[]
  height?: number
}

export function CompetitorRadar({ competitors, height = 300 }: CompetitorRadarProps) {
  if (!competitors.length) return null

  // Compute min/max for each axis to normalize
  const prices         = competitors.map(c => c.price_inr ?? 1000)
  const ratings        = competitors.map(c => c.rating ?? 0)
  const reviewCounts   = competitors.map(c => c.review_count ?? 0)
  const featureCounts  = competitors.map(c => c.feature_count ?? 0)
  const marketingScores = competitors.map(c => c.marketing_score ?? 0)

  const minMax = (arr: number[]) => [Math.min(...arr), Math.max(...arr)] as const

  const [minP, maxP] = minMax(prices)
  const [minR, maxR] = minMax(ratings)
  const [minRv, maxRv] = minMax(reviewCounts)
  const [minF, maxF] = minMax(featureCounts)
  const [minM, maxM] = minMax(marketingScores)

  // Note: lower price = better positioning → invert price
  const chartData = AXIS_LABELS.map((axis, i) => {
    const row: Record<string, unknown> = { axis }
    competitors.forEach((comp, ci) => {
      let val = 0
      if (i === 0) val = 100 - normalize(comp.price_inr ?? minP, minP, maxP) // inverted
      if (i === 1) val = normalize(comp.rating ?? minR, minR, maxR)
      if (i === 2) val = normalize(comp.review_count ?? minRv, minRv, maxRv)
      if (i === 3) val = normalize(comp.feature_count ?? minF, minF, maxF)
      if (i === 4) val = normalize(comp.marketing_score ?? minM, minM, maxM)
      row[comp.name] = val
    })
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={chartData} cx="50%" cy="45%" outerRadius={height * 0.32}>
        <PolarGrid gridType="polygon" stroke="#F0F2F5" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fontSize: 10, fill: '#A3A3A3' }}
        />
        {competitors.slice(0, 6).map((comp, i) => (
          <Radar
            key={comp.name}
            name={comp.name}
            dataKey={comp.name}
            stroke={PALETTE[i % PALETTE.length]}
            fill={PALETTE[i % PALETTE.length]}
            fillOpacity={0.08}
            strokeWidth={2}
            isAnimationActive
            animationDuration={700}
          />
        ))}
        <Tooltip
          contentStyle={{
            background: '#0F0F0F',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 12,
            fontSize: 11,
            color: '#fff',
          }}
          labelStyle={{ color: '#A3A3A3', fontWeight: 600 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
          formatter={(value) => (
            <span style={{ color: '#6B6B6B' }}>{value}</span>
          )}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
