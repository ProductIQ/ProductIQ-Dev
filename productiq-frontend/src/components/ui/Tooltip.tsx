// src/components/ui/Tooltip.tsx
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

export function Tooltip({ content, children, placement = 'top', delay = 300, className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function show() {
    timerRef.current = setTimeout(() => setVisible(true), delay)
  }

  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const placementClasses = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full   left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2  -translate-y-1/2 mr-2',
    right:  'left-full  top-1/2  -translate-y-1/2 ml-2',
  }

  const enterVariants = {
    top:    { opacity: 0, y: 4 },
    bottom: { opacity: 0, y: -4 },
    left:   { opacity: 0, x: 4 },
    right:  { opacity: 0, x: -4 },
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            role="tooltip"
            initial={enterVariants[placement]}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute z-50 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white whitespace-nowrap pointer-events-none',
              placementClasses[placement],
              className,
            )}
            style={{ background: '#0A0A0A', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
