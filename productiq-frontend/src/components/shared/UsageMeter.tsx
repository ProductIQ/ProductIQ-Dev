// src/components/shared/UsageMeter.tsx
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface UsageMeterProps {
  used: number
  limit: number
  extraFromReferrals?: number
  plan?: string
  showLabel?: boolean
  className?: string
}

export function UsageMeter({ used, limit, extraFromReferrals = 0, plan, showLabel = true, className }: UsageMeterProps) {
  const totalLimit = limit + extraFromReferrals
  const pct = Math.min(100, (used / totalLimit) * 100)

  const barColor =
    pct > 80 ? '#EF4444' :
    pct > 60 ? '#F59E0B' :
    '#C8F04A'

  return (
    <div className={cn('w-full', className)}>
      <div className="h-2 bg-[rgba(0,0,0,0.07)] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-[12px] text-[#A3A3A3]">
            {used} of {totalLimit} reports used
          </span>
          {pct > 80 && plan === 'free' && (
            <a href="/pricing" className="text-[12px] font-semibold text-[#0A0A0A] underline underline-offset-2">
              Upgrade ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}
