// src/components/ui/Progress.tsx
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number        // 0–100
  height?: number      // px, default 6
  color?: string       // Tailwind class or explicit color
  className?: string
  animated?: boolean
}

export function Progress({ value, height = 6, color, className, animated = true }: ProgressProps) {
  const clamp = Math.min(100, Math.max(0, value))

  // Default color: lime accent
  const fillColor = color ?? '#C8F04A'

  return (
    <div
      className={cn('w-full rounded-full bg-[rgba(0,0,0,0.07)] overflow-hidden', className)}
      style={{ height: `${height}px` }}
    >
      {animated ? (
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: fillColor }}
          initial={{ width: 0 }}
          animate={{ width: `${clamp}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ) : (
        <div
          className="h-full rounded-full"
          style={{ backgroundColor: fillColor, width: `${clamp}%` }}
        />
      )}
    </div>
  )
}
