// src/components/ui/Card.tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'white' | 'dark' | 'accent'
  hover?: boolean
}

export function Card({ variant = 'white', hover = false, className, children, ...props }: CardProps) {
  const variants = {
    white: 'bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]',
    dark:  'bg-[#0F0F0F] rounded-[20px] border border-[rgba(255,255,255,0.08)] text-white',
    accent:'bg-[#C8F04A] rounded-[20px] border border-[rgba(0,0,0,0.08)]',
  }

  return (
    <div
      className={cn(
        variants[variant],
        hover && 'transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.09)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
