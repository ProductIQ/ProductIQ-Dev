// src/components/charts/ClusterBubbleChart.tsx
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

export interface ClusterPoint {
  topic_id: number
  topic_label: string
  topic_type: 'pain_point' | 'feature_request' | 'praise' | 'neutral'
  avg_sentiment: number
  review_count: number
}

const TYPE_COLOR: Record<string, string> = {
  pain_point:       '#F09595',
  feature_request:  '#AFA9EC',
  praise:           '#97C459',
  neutral:          '#B4B2A9',
}

function CustomDot(props: Record<string, unknown>) {
  const { cx, cy, payload } = props as { cx: number; cy: number; payload: ClusterPoint }
  const color = TYPE_COLOR[payload.topic_type] ?? '#A3A3A3'
  const r = Math.max(6, Math.min(28, Math.sqrt(payload.review_count ?? 1) * 1.8))

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.6} stroke={color} strokeWidth={1.5} />
    </g>
  )
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ClusterPoint }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  return (
    <div
      className="rounded-[12px] px-3 py-2.5 text-[12px] shadow-lg"
      style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.10)' }}
    >
      <p className="font-semibold text-white mb-1">{d.topic_label}</p>
      <p className="text-white/50">{d.review_count} reviews</p>
      <p
        className="font-mono mt-0.5"
        style={{ color: d.avg_sentiment >= 0 ? '#22C55E' : '#EF4444' }}
      >
        Sentiment {d.avg_sentiment >= 0 ? '+' : ''}{d.avg_sentiment.toFixed(2)}
      </p>
      <span
        className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
        style={{ background: TYPE_COLOR[d.topic_type] + '40', color: TYPE_COLOR[d.topic_type] }}
      >
        {d.topic_type.replace('_', ' ')}
      </span>
    </div>
  )
}

interface ClusterBubbleChartProps {
  data: ClusterPoint[]
  height?: number
}

export function ClusterBubbleChart({ data, height = 280 }: ClusterBubbleChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-[13px] text-[#A3A3A3]" style={{ height }}>
        No cluster data yet
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#F0F2F5" />
          <XAxis
            type="number"
            dataKey="topic_id"
            hide
            domain={['dataMin - 1', 'dataMax + 1']}
          />
          <YAxis
            type="number"
            dataKey="avg_sentiment"
            domain={[-1, 1]}
            tickCount={5}
            tick={{ fontSize: 10, fill: '#A3A3A3' }}
            tickFormatter={v => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1))}
            axisLine={false}
            tickLine={false}
          />
          <ZAxis
            type="number"
            dataKey="review_count"
            range={[40, 800]}
          />
          <ReferenceLine y={0} stroke="#E5E7EB" strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Scatter
            data={data}
            shape={<CustomDot cx={0} cy={0} payload={data[0]} />}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries(TYPE_COLOR).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5 text-[11px] text-[#6B6B6B]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            {type.replace('_', ' ')}
          </span>
        ))}
      </div>
    </div>
  )
}
