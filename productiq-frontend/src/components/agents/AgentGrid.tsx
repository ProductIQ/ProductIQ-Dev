// src/components/agents/AgentGrid.tsx
import { motion } from 'motion/react'
import { AgentCard } from './AgentCard'
import type { AgentStatus } from '@/types/agent'
import { AGENT_DEFINITIONS } from '@/types/agent'

interface AgentGridProps {
  agentStatuses: Record<number, AgentStatus>
  agentOutputs?: Array<{ agent_number: number; started_at: string | null; completed_at: string | null }>
}

export function AgentGrid({ agentStatuses, agentOutputs = [] }: AgentGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {AGENT_DEFINITIONS.map((agent, idx) => {
        const output = agentOutputs.find((o) => o.agent_number === agent.number)
        return (
          <motion.div
            key={agent.number}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
          >
            <AgentCard
              agentNumber={agent.number}
              agentName={agent.name}
              description={agent.description}
              status={agentStatuses[agent.number] ?? 'pending'}
              startedAt={output?.started_at}
              completedAt={output?.completed_at}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
