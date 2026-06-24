// src/components/ui/Badge.tsx
import React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'brand' | 'success' | 'warning' | 'danger' | 'neutral'
type BadgeSize    = 'sm' | 'md'

interface BadgeProps {
  variant?:  BadgeVariant
  size?:     BadgeSize
  dot?:      boolean
  pulse?:    boolean
  children?: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  brand:   'bg-brand-500/20 text-brand-300 border border-brand-500/30',
  success: 'bg-green-500/15 text-green-400  border border-green-500/25',
  warning: 'bg-amber-500/15 text-amber-400  border border-amber-500/25',
  danger:  'bg-red-500/15   text-red-400    border border-red-500/25',
  neutral: 'bg-surface-0   text-ink-secondary border border-surface-3',
}

const dotColors: Record<BadgeVariant, string> = {
  brand:   'bg-brand-400',
  success: 'bg-green-400',
  warning: 'bg-amber-400',
  danger:  'bg-red-400',
  neutral: 'bg-surface-4',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1',
  md: 'px-2.5 py-1   text-xs     gap-1.5',
}

export function Badge({ variant = 'neutral', size = 'md', dot, pulse, children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full',
      variantClasses[variant],
      sizeClasses[size],
      className,
    )}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          dotColors[variant],
          pulse && 'animate-pulse-soft',
        )} />
      )}
      {children}
    </span>
  )
}
