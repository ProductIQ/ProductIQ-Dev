// src/components/agents/AgentCard.tsx
import { memo } from 'react'
import { motion } from 'motion/react'
import type { AgentStatus } from '@/types/agent'

interface AgentCardProps {
  agentNumber:  number
  agentName:    string
  description:  string
  status:       AgentStatus
  startedAt?:   string | null
  completedAt?: string | null
}

const configs = {
  pending: {
    bg:      '#fff',
    border:  'rgba(0,0,0,0.08)',
    numCol:  '#D1D5DB',
    nameCol: '#9CA3AF',
    descCol: '#C4C9CF',
    dotBg:   '#E5E7EB',
    dotCol:  'transparent',
    label:   'Waiting',
  },
  running: {
    bg:      '#0F0F0F',
    border:  '#C8F04A',
    numCol:  '#C8F04A',
    nameCol: '#FFFFFF',
    descCol: 'rgba(255,255,255,0.55)',
    dotBg:   '#C8F04A',
    dotCol:  '#C8F04A',
    label:   'Processing',
  },
  completed: {
    bg:      '#fff',
    border:  'rgba(34,197,94,0.25)',
    numCol:  '#22C55E',
    nameCol: '#0A0A0A',
    descCol: '#6B6B6B',
    dotBg:   '#22C55E',
    dotCol:  '#22C55E',
    label:   'Complete',
  },
  failed: {
    bg:      '#fff',
    border:  'rgba(239,68,68,0.20)',
    numCol:  '#EF4444',
    nameCol: '#EF4444',
    descCol: '#FCA5A5',
    dotBg:   '#EF4444',
    dotCol:  '#EF4444',
    label:   'Failed',
  },
}

function AgentCardComponent({ agentNumber, agentName, description, status }: AgentCardProps) {
  const cfg = configs[status]

  return (
    <motion.div
      layout
      className="rounded-[18px] p-5 flex flex-col h-full"
      style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        transition: 'background 0.35s ease, border-color 0.35s ease',
      }}
      animate={status === 'running' ? {
        boxShadow: ['0 0 0 0 rgba(200,240,74,0)', '0 0 0 6px rgba(200,240,74,0.12)', '0 0 0 0 rgba(200,240,74,0)'],
      } : { boxShadow: 'none' }}
      transition={status === 'running' ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : {}}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="font-mono text-[10px] font-semibold tracking-widest"
          style={{ color: cfg.numCol }}
        >
          {String(agentNumber).padStart(2, '0')}
        </span>
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: cfg.dotBg,
            animation: status === 'running' ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }}
        />
      </div>

      {/* Name */}
      <div className="text-[13px] font-semibold leading-snug mb-2" style={{ color: cfg.nameCol }}>
        {agentName}
      </div>

      {/* Desc */}
      <div className="text-[11px] leading-[1.6] flex-1" style={{ color: cfg.descCol }}>
        {description}
      </div>

      {/* Status label */}
      <div
        className="mt-4 text-[10px] font-semibold tracking-widest uppercase"
        style={{ color: cfg.numCol }}
      >
        {cfg.label}
      </div>
    </motion.div>
  )
}

export const AgentCard = memo(AgentCardComponent)
