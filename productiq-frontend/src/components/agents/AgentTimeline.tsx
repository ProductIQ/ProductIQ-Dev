// src/components/agents/AgentTimeline.tsx
import { motion } from 'motion/react'
import type { AgentStatus } from '@/types/agent'
import { formatDuration } from '@/lib/utils'

export interface AgentTimelineEntry {
  agentNumber: number
  agentName: string
  description: string
  status: AgentStatus
  startedAt?: string | null
  completedAt?: string | null
}

interface AgentTimelineProps {
  agents: AgentTimelineEntry[]
}

const STATUS_DOT: Record<AgentStatus, { bg: string; pulse: boolean }> = {
  pending:   { bg: '#E5E7EB', pulse: false },
  running:   { bg: '#C8F04A', pulse: true },
  completed: { bg: '#22C55E', pulse: false },
  failed:    { bg: '#EF4444', pulse: false },
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  pending:   'Waiting',
  running:   'Processing',
  completed: 'Complete',
  failed:    'Failed',
}

function getDuration(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000)
}

export function AgentTimeline({ agents }: AgentTimelineProps) {
  return (
    <div className="relative pl-8">
      {/* Vertical spine */}
      <div
        className="absolute left-3 top-3 bottom-3 w-0.5 rounded-full"
        style={{ background: 'rgba(0,0,0,0.08)' }}
      />

      <div className="space-y-5">
        {agents.map((agent, i) => {
          const dotCfg  = STATUS_DOT[agent.status]
          const duration = getDuration(agent.startedAt, agent.completedAt)
          const isActive = agent.status === 'running'
          const isDone   = agent.status === 'completed'
          const isFailed = agent.status === 'failed'

          return (
            <motion.div
              key={agent.agentNumber}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              className="relative flex items-start gap-4"
            >
              {/* Status dot */}
              <div
                className="absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white flex-shrink-0"
                style={{
                  background: dotCfg.bg,
                  animation: dotCfg.pulse ? 'pulse 1.5s ease-in-out infinite' : 'none',
                }}
              />

              {/* Card */}
              <div
                className="flex-1 rounded-[14px] px-4 py-3 transition-all duration-300"
                style={{
                  background: isActive ? '#0F0F0F' : '#fff',
                  border: isActive
                    ? '1.5px solid #C8F04A'
                    : isFailed
                    ? '1px solid rgba(239,68,68,0.20)'
                    : isDone
                    ? '1px solid rgba(34,197,94,0.20)'
                    : '1px solid rgba(0,0,0,0.07)',
                  boxShadow: isActive ? '0 0 0 4px rgba(200,240,74,0.08)' : 'none',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="font-mono text-[10px] font-semibold flex-shrink-0"
                      style={{
                        color: isActive ? '#C8F04A' : isDone ? '#22C55E' : isFailed ? '#EF4444' : '#D1D5DB',
                      }}
                    >
                      {String(agent.agentNumber).padStart(2, '0')}
                    </span>
                    <span
                      className="text-[13px] font-semibold truncate"
                      style={{ color: isActive ? '#fff' : isDone || isFailed ? '#0A0A0A' : '#9CA3AF' }}
                    >
                      {agent.agentName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Duration */}
                    {duration != null && (
                      <span className="font-mono text-[10px]" style={{ color: isActive ? '#C8F04A60' : '#A3A3A3' }}>
                        {formatDuration(duration)}
                      </span>
                    )}

                    {/* Status label */}
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest"
                      style={{
                        color: isActive ? '#C8F04A'
                          : isDone ? '#22C55E'
                          : isFailed ? '#EF4444'
                          : '#D1D5DB',
                      }}
                    >
                      {STATUS_LABEL[agent.status]}
                    </span>
                  </div>
                </div>

                {/* Description (only when running or completed) */}
                {(isActive || isDone) && (
                  <p
                    className="text-[11px] mt-1.5 leading-relaxed"
                    style={{ color: isActive ? 'rgba(255,255,255,0.50)' : '#A3A3A3' }}
                  >
                    {agent.description}
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
