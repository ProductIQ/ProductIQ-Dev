// src/hooks/useRealtimeAgentRun.ts
import { useState } from 'react'

export interface AgentOutput {
  agent_name: string
  agent_number: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  tokens_used?: number
  duration_seconds?: number
  started_at?: string
  completed_at?: string
}

interface UseRealtimeAgentRunReturn {
  run: null
  agentOutputs: AgentOutput[]
  isConnected: boolean
}

/**
 * Stub hook for Supabase Realtime agent run subscription.
 * Returns empty state until backend is connected.
 * The RunStatusPage uses useAgentStream (SSE) as primary source.
 */
export function useRealtimeAgentRun(_runId?: string): UseRealtimeAgentRunReturn {
  const [agentOutputs] = useState<AgentOutput[]>([])

  return {
    run: null,
    agentOutputs,
    isConnected: false,
  }
}
