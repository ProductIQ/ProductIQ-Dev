// src/hooks/useAgentStream.ts
// ════════════════════════════════════════════════════════════════
// Mock SSE hook — simulates 8 agents activating sequentially.
// Replace with real EventSource when backend is ready:
//   const es = new EventSource(`/api/stream/${runId}`)
// ════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react'
import type { AgentStatus, LogEntry } from '@/types/agent'
import { AGENT_DEFINITIONS } from '@/types/agent'

export interface AgentStreamState {
  agentStatuses: Record<number, AgentStatus>
  progressPct: number
  logs: LogEntry[]
  isConnected: boolean
  currentAgentNumber: number | null
}

const AGENT_DURATION_MS = 3200  // each agent "runs" for this duration

export function useAgentStream(runId: string | null, enabled = true): AgentStreamState {
  const [agentStatuses, setAgentStatuses] = useState<Record<number, AgentStatus>>(() =>
    Object.fromEntries(AGENT_DEFINITIONS.map((a) => [a.number, 'pending' as AgentStatus]))
  )
  const [progressPct, setProgressPct]           = useState(0)
  const [logs, setLogs]                         = useState<LogEntry[]>([])
  const [isConnected, setIsConnected]           = useState(false)
  const [currentAgentNumber, setCurrentAgent]   = useState<number | null>(null)
  const agentIndex = useRef(0)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const appendLog = useCallback((agent: string, message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
        agent,
        message,
      },
    ])
  }, [])

  useEffect(() => {
    if (!runId || !enabled) return

    setIsConnected(true)
    agentIndex.current = 0

    // Start first agent immediately
    const runNextAgent = () => {
      const idx = agentIndex.current
      if (idx >= AGENT_DEFINITIONS.length) {
        // All done
        setProgressPct(100)
        setCurrentAgent(null)
        setIsConnected(false)
        return
      }
      const agent = AGENT_DEFINITIONS[idx]
      setCurrentAgent(agent.number)
      setAgentStatuses((prev) => ({ ...prev, [agent.number]: 'running' }))
      setProgressPct(Math.round((idx / AGENT_DEFINITIONS.length) * 100))
      appendLog(agent.name, `Starting: ${agent.description}`)

      timerRef.current = setTimeout(() => {
        setAgentStatuses((prev) => ({ ...prev, [agent.number]: 'completed' }))
        appendLog(agent.name, `✓ Completed in ${(AGENT_DURATION_MS / 1000).toFixed(1)}s`)
        agentIndex.current += 1
        runNextAgent()
      }, AGENT_DURATION_MS)
    }

    // Short delay before pipeline starts
    const startTimer = setTimeout(runNextAgent, 600)

    return () => {
      clearTimeout(startTimer)
      if (timerRef.current) clearTimeout(timerRef.current)
      setIsConnected(false)
    }
  }, [runId, enabled, appendLog])

  return { agentStatuses, progressPct, logs, isConnected, currentAgentNumber }
}
