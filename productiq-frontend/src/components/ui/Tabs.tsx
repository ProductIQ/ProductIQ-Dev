// src/components/ui/Tabs.tsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (id: string) => void
  children: (activeTab: string) => React.ReactNode
  className?: string
}

export function Tabs({ tabs, defaultTab, onChange, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id)

  function handleChange(id: string) {
    setActiveTab(id)
    onChange?.(id)
  }

  return (
    <div className={className}>
      {/* Tab list */}
      <div className="flex items-center gap-1 border-b border-[rgba(0,0,0,0.08)] mb-6 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 flex-shrink-0',
              activeTab === tab.id
                ? 'text-[#0A0A0A]'
                : 'text-[#A3A3A3] hover:text-[#6B6B6B]'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                activeTab === tab.id ? 'bg-[#0A0A0A] text-white' : 'bg-[rgba(0,0,0,0.06)] text-[#A3A3A3]'
              )}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <motion.span
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0A0A0A] rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {children(activeTab)}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
