// src/components/ui/Button.tsx
import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:  'bg-brand-500 hover:bg-brand-400 text-white shadow-glow-sm hover:shadow-glow-brand-lg active:scale-[0.97] transition-all duration-200',
  secondary:'bg-surface-0 hover:bg-surface-4 text-ink-primary border border-surface-3 hover:border-surface-4 active:scale-[0.97] transition-all duration-200',
  outline:  'border border-brand-500/40 text-brand-400 hover:bg-brand-500/10 hover:border-brand-400 active:scale-[0.97] transition-all duration-200',
  ghost:    'text-ink-secondary hover:text-ink-primary hover:bg-surface-0 active:scale-[0.97] transition-all duration-200',
  danger:   'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 hover:border-red-500 active:scale-[0.97] transition-all duration-200',
}

const sizeClasses: Record<Size, string> = {
  sm:  'h-8  px-3  text-xs  gap-1.5 rounded-lg',
  md:  'h-10 px-4  text-sm  gap-2   rounded-lg',
  lg:  'h-12 px-6  text-sm  gap-2.5 rounded-xl font-medium',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed select-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={size === 'sm' ? 12 : 14} />
        ) : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)
Button.displayName = 'Button'
