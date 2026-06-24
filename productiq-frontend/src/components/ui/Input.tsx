// src/components/ui/Input.tsx
import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:       string
  helper?:      string
  error?:       string
  leftIcon?:    React.ReactNode
  rightIcon?:   React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helper, error, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-ink-secondary">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-ink-tertiary pointer-events-none">{leftIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-10 px-3 text-sm bg-surface-1 border border-surface-3 rounded-lg text-ink-primary placeholder:text-ink-tertiary',
              'focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20',
              'transition-all duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon  && 'pl-9',
              rightIcon && 'pr-9',
              error     && 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-ink-tertiary">{rightIcon}</span>
          )}
        </div>
        <AnimatePresence mode="wait">
          {error ? (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-red-400"
            >
              {error}
            </motion.p>
          ) : helper ? (
            <p className="text-xs text-ink-tertiary">{helper}</p>
          ) : null}
        </AnimatePresence>
      </div>
    )
  }
)
Input.displayName = 'Input'
