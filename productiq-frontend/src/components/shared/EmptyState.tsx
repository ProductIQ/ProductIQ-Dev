// src/components/shared/EmptyState.tsx
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      <div className="w-14 h-14 rounded-2xl border border-[rgba(0,0,0,0.07)] bg-[#F8F9FB] flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-[#A3A3A3]" />
      </div>
      <p className="text-[14px] font-semibold text-[#0A0A0A]">{title}</p>
      {description && (
        <p className="text-[13px] text-[#A3A3A3] mt-1.5 max-w-xs leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 btn btn-outline btn-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
