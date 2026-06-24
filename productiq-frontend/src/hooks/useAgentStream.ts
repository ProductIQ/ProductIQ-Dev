// src/hooks/useAgentStream.ts
// Real SSE hook — connects to FastAPI /api/stream/{run_id} via EventSource.
// Falls back to polling the run status if SSE fails or is unsupported.
import { useState, useEffect, useRef, useCallback } from 'react'
import type { AgentStatus, LogEntry } from '@/types/agent'
import { AGENT_DEFINITIONS } from '@/types/agent'
import { buildSseUrl, getRun } from '@/lib/api'

export interface AgentStreamState {
  agentStatuses: Record<number, AgentStatus>
  progressPct: number
  logs: LogEntry[]
  isConnected: boolean
  currentAgentNumber: number | null
}

export function useAgentStream(runId: string | null, enabled = true): AgentStreamState {
  const [agentStatuses, setAgentStatuses] = useState<Record<number, AgentStatus>>(() =>
    Object.fromEntries(AGENT_DEFINITIONS.map((a) => [a.number, 'pending' as AgentStatus]))
  )
  const [progressPct, setProgressPct] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [currentAgentNumber, setCurrentAgent] = useState<number | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  // ── Apply an SSE event to state ───────────────────────────────
  const applyEvent = useCallback(
    (data: Record<string, unknown>) => {
      const type = data.type as string | undefined
      const agentName = (data.agent_name as string) ?? 'Agent'
      const agentNum = data.agent_number as number | undefined
      const status = data.status as AgentStatus | undefined
      const progress = data.progress_pct as number | undefined

      if (progress !== undefined) setProgressPct(progress)

      if (agentNum !== undefined && status) {
        setAgentStatuses((prev) => ({ ...prev, [agentNum]: status }))
        if (status === 'running') {
          setCurrentAgent(agentNum)
          const def = AGENT_DEFINITIONS.find((a) => a.number === agentNum)
          appendLog(agentName, `Starting: ${def?.description ?? ''}`)
        } else if (status === 'completed') {
          appendLog(agentName, '✓ Completed')
        } else if (status === 'failed') {
          appendLog(agentName, '✗ Failed')
        }
      }

      if (type === 'run_completed') {
        setProgressPct(100)
        setCurrentAgent(null)
        // Mark all 8 core agents as completed
        setAgentStatuses((prev) => {
          const next = { ...prev }
          for (const a of AGENT_DEFINITIONS) {
            if (a.number <= 8 && next[a.number] !== 'failed') {
              next[a.number] = 'completed'
            }
          }
          return next
        })
        appendLog('Pipeline', 'Report generation complete.')
      }

      if (type === 'run_failed') {
        setCurrentAgent(null)
        const errorMsg = (data.error as string) ?? 'Unknown error'
        appendLog('Pipeline', `✗ Failed: ${errorMsg}`)
      }
    },
    [appendLog]
  )

  // ── Fallback: poll run status if SSE fails ────────────────────
  const startPolling = useCallback(
    (id: string) => {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const data = await getRun(id)
          const run = data.run
          if (!run) return

          setProgressPct(run.progress_pct ?? 0)

          // Update agent statuses from agent_outputs
          if (data.agent_outputs) {
            setAgentStatuses((prev) => {
              const next = { ...prev }
              for (const ao of data.agent_outputs) {
                const num = ao.agent_number
                if (num && num <= 8) {
                  next[num] = ao.status as AgentStatus
                }
              }
              return next
            })
          }

          if (run.status === 'completed') {
            setProgressPct(100)
            setCurrentAgent(null)
            if (pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
            }
          } else if (run.status === 'failed') {
            setCurrentAgent(null)
            if (pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
            }
          }
        } catch {
          // Silently ignore poll errors
        }
      }, 5000)
    },
    []
  )

  useEffect(() => {
    if (!runId || !enabled) return

    let cancelled = false

    async function connect() {
      const url = await buildSseUrl(runId!)
      if (cancelled) return

      const es = new EventSource(url)
      eventSourceRef.current = es

      es.onopen = () => {
        setIsConnected(true)
      }

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          applyEvent(data)
        } catch {
          // Heartbeat or non-JSON — ignore
        }
      }

      es.onerror = () => {
        setIsConnected(false)
        es.close()
        eventSourceRef.current = null
        // Fall back to polling
        if (!cancelled) startPolling(runId!)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      setIsConnected(false)
    }
  }, [runId, enabled, applyEvent, startPolling])

  return { agentStatuses, progressPct, logs, isConnected, currentAgentNumber }
}
