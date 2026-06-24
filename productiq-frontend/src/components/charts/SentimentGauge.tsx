// src/components/charts/SentimentGauge.tsx
import { motion } from 'motion/react'
import { useMemo } from 'react'

interface SentimentGaugeProps {
  score: number          // -1.0 to +1.0
  size?: 'compact' | 'large'
}

function sentimentLabel(score: number) {
  if (score < -0.6) return 'Very Negative'
  if (score < -0.2) return 'Negative'
  if (score < 0.2)  return 'Neutral'
  if (score < 0.6)  return 'Positive'
  return 'Very Positive'
}

function sentimentColor(score: number) {
  if (score < -0.6) return '#EF4444'
  if (score < -0.2) return '#F97316'
  if (score < 0.2)  return '#A3A3A3'
  if (score < 0.6)  return '#22C55E'
  return '#16A34A'
}

export function SentimentGauge({ score, size = 'large' }: SentimentGaugeProps) {
  const isLarge = size === 'large'

  // SVG dimensions
  const width  = isLarge ? 300 : 200
  const height = isLarge ? 170 : 115
  const cx     = width / 2
  const cy     = isLarge ? 148 : 100
  const radius = isLarge ? 118 : 80

  // Arc path (180° semicircle, left to right)
  const strokeW = isLarge ? 14 : 10

  function polarToCartesian(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  }

  function arcPath(startAngle: number, endAngle: number, r: number) {
    const s = polarToCartesian(startAngle, r)
    const e = polarToCartesian(endAngle, r)
    const lg = endAngle - startAngle > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${lg} 1 ${e.x} ${e.y}`
  }

  // Total arc: 180° → from 180° to 360° (bottom-left to bottom-right)
  const startAngle = 180
  const endAngle   = 360

  // Arc circumference approximation for dash
  const arcLen = Math.PI * radius
  const targetOffset = arcLen - ((score + 1) / 2) * arcLen

  // Needle rotation
  const needleDeg = (score + 1) / 2 * 180 - 90  // -90 → +90

  // Center dot + needle base
  const needleLen = radius - (isLarge ? 20 : 14)
  const needleTip = polarToCartesian(startAngle + (score + 1) / 2 * 180, needleLen)
  const dotR = isLarge ? 5 : 3.5

  // Label positions
  const leftTip  = polarToCartesian(180, radius + (isLarge ? 10 : 7))
  const rightTip = polarToCartesian(360, radius + (isLarge ? 10 : 7))
  const topMid   = polarToCartesian(270, radius + (isLarge ? 10 : 7))

  const scoreColor = sentimentColor(score)
  const label      = sentimentLabel(score)

  const gradId = `sg-${size}-grad`

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#EF4444" />
            <stop offset="35%"  stopColor="#F97316" />
            <stop offset="50%"  stopColor="#EAB308" />
            <stop offset="70%"  stopColor="#86EFAC" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
        </defs>

        {/* Background arc */}
        <path
          d={arcPath(startAngle, endAngle, radius)}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* Colored score arc (animated) */}
        <motion.path
          d={arcPath(startAngle, endAngle, radius)}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={arcLen}
          initial={{ strokeDashoffset: arcLen }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />

        {/* Needle */}
        <motion.line
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="#0A0A0A"
          strokeWidth={isLarge ? 2.5 : 2}
          strokeLinecap="round"
          initial={{ rotate: -90 }}
          animate={{ rotate: needleDeg }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          transition={{ duration: 0.9, ease: 'easeOut', type: 'spring', stiffness: 60 }}
        />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={dotR} fill="#6B6B6B" />

        {/* Labels */}
        <text x={leftTip.x + 4} y={leftTip.y + 4} fontSize={isLarge ? 10 : 8} fill="#EF4444" textAnchor="end">-1</text>
        <text x={topMid.x}      y={topMid.y}       fontSize={isLarge ? 10 : 8} fill="#A3A3A3" textAnchor="middle">0</text>
        <text x={rightTip.x - 4} y={rightTip.y + 4} fontSize={isLarge ? 10 : 8} fill="#16A34A" textAnchor="start">+1</text>
      </svg>

      {/* Score display */}
      <div className="text-center -mt-2">
        <div className="text-[32px] font-black font-mono leading-none" style={{ color: scoreColor }}>
          {score >= 0 ? '+' : ''}{score.toFixed(2)}
        </div>
        <div className="text-[13px] font-semibold mt-1" style={{ color: scoreColor }}>
          {label}
        </div>
      </div>
    </div>
  )
}
