// src/components/ui/Dialog.tsx
import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

export function Dialog({ open, onClose, title, description, children, className, size = 'md' }: DialogProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          />

          {/* Panel */}
          <motion.div
            key="dialog-panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full',
              sizeMap[size],
              'bg-white rounded-[24px] shadow-[0_24px_64px_rgba(0,0,0,0.15)] border border-[rgba(0,0,0,0.07)]',
              className,
            )}
          >
            {/* Header */}
            {(title || description) && (
              <div className="px-6 pt-6 pb-4 border-b border-[rgba(0,0,0,0.06)]">
                {title && <h2 className="text-[16px] font-bold text-[#0A0A0A] leading-snug">{title}</h2>}
                {description && <p className="text-[13px] text-[#6B6B6B] mt-1 leading-relaxed">{description}</p>}
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-5">{children}</div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-[#A3A3A3] hover:text-[#0A0A0A] hover:bg-[#F0F2F5] transition-all"
            >
              <X size={15} />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
