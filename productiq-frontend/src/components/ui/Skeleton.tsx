// src/components/ui/Skeleton.tsx
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

export function Skeleton({ className, rounded = 'md' }: SkeletonProps) {
  const roundMap = {
    sm:   'rounded',
    md:   'rounded-lg',
    lg:   'rounded-2xl',
    full: 'rounded-full',
  }

  return (
    <div
      className={cn(
        'animate-pulse bg-[rgba(0,0,0,0.07)]',
        roundMap[rounded],
        className,
      )}
    />
  )
}

// Convenience compositions
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-6 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10" rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-24" rounded="lg" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  )
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      <Skeleton className="w-8 h-8 flex-shrink-0" rounded="md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
      <Skeleton className="h-6 w-16" rounded="full" />
    </div>
  )
}
