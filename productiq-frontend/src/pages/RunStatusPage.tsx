// src/pages/RunStatusPage.tsx
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, ChevronDown, Download } from 'lucide-react'
import confetti from 'canvas-confetti'
import { AgentGrid } from '@/components/agents/AgentGrid'
import { useAgentStream } from '@/hooks/useAgentStream'
import { useRun } from '@/hooks/useRuns'
import { useUIStore } from '@/stores/useUIStore'

export function RunStatusPage() {
  const { runId }             = useParams<{ runId: string }>()
  const navigate              = useNavigate()
  const prevCollapsed         = useRef(useUIStore.getState().sidebarCollapsed)
  const setSidebarCollapsed   = useUIStore((s) => s.setSidebarCollapsed)
  const confettiFired         = useRef(false)
  const logRef                = useRef<HTMLDivElement>(null)
  const [logOpen, setLogOpen] = useState(false)

  // Fetch run data from the real API
  const { data: runData } = useRun(runId ?? null)
  const run = runData?.run ?? null

  // Collapse sidebar on this full-page view
  useEffect(() => {
    setSidebarCollapsed(true)
    return () => setSidebarCollapsed(prevCollapsed.current)
  }, [setSidebarCollapsed])

  const { agentStatuses, progressPct, logs, isConnected } = useAgentStream(
    runId ?? null,
    run?.status !== 'completed',
  )

  const allDone   = Object.values(agentStatuses).every((s) => s === 'completed')
  const anyFail   = Object.values(agentStatuses).some((s) => s === 'failed')
  const effective = anyFail ? 'failed' : (allDone || run?.status === 'completed') ? 'completed' : 'running'

  // Confetti on completion
  useEffect(() => {
    if (effective === 'completed' && !confettiFired.current) {
      confettiFired.current = true
      confetti({
        particleCount: 70,
        spread: 55,
        origin: { y: 0.55 },
        colors: ['#C8F04A', '#0A0A0A', '#22C55E', '#A3A3A3'],
      })
    }
  }, [effective])

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs.length])

  const displayProgress = effective === 'completed' ? 100 : progressPct

  // Status pill
  const StatusPill = () => {
    const cfg = {
      completed: { color: '#22C55E', label: 'Report ready' },
      failed:    { color: '#EF4444', label: 'Failed'       },
      running:   { color: '#C8F04A', label: 'Running'      },
    }[effective] ?? { color: '#C8F04A', label: 'Running' }

    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full"
        style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}35` }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: cfg.color, animation: effective === 'running' ? 'pulse 1.5s ease-in-out infinite' : 'none' }}
        />
        {cfg.label}
      </span>
    )
  }

  return (
    <div className="max-w-[900px] mx-auto">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center justify-between mb-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors font-medium"
        >
          <ArrowLeft size={13} />
          Dashboard
        </Link>
        <StatusPill />
      </div>

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-[26px] font-bold tracking-tight text-[#0A0A0A] mb-1">
          {run?.product_category ?? 'Intelligence Report'}
        </h1>
        <div className="flex items-center gap-4">
          {run?.brand_name && <span className="text-[13px] text-[#6B6B6B]">Brand: {run.brand_name}</span>}
          <span className="text-[11px] font-mono text-[#A3A3A3]">Run {runId?.slice(0, 8)}</span>
        </div>
      </div>

      {/* ── Progress ── */}
      <div className="bg-white rounded-[18px] p-6 mb-6" style={{ border: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: isConnected ? '#C8F04A' : '#D1D5DB',
                animation: isConnected ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }}
            />
            <span className="text-[11px] font-semibold tracking-widest uppercase text-[#A3A3A3]">
              {isConnected ? 'Live' : 'Polling'}
            </span>
          </div>
          <span className="text-[13px] font-mono font-semibold text-[#0A0A0A]">
            {effective === 'completed' ? '100% · Done' : `${displayProgress}%`}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F0F2F5' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: effective === 'completed' ? '#22C55E' : '#C8F04A' }}
            animate={{ width: `${displayProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* ── Agent Grid ── */}
      <AgentGrid agentStatuses={agentStatuses} />

      {/* ── Live Log ── */}
      <div className="mt-6">
        <button
          onClick={() => setLogOpen(!logOpen)}
          className="flex items-center gap-2 text-[12px] font-semibold text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors mb-2 tracking-wide uppercase"
        >
          Live log
          <ChevronDown size={13} className={`transition-transform duration-200 ${logOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {logOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                ref={logRef}
                className="rounded-[14px] p-5 font-mono text-[11px] max-h-52 overflow-y-auto"
                style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {logs.length === 0 ? (
                  <span style={{ color: '#444' }}>Waiting for agents to start&hellip;</span>
                ) : logs.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3 mb-2 last:mb-0"
                  >
                    <span style={{ color: '#444' }}>{entry.timestamp}</span>
                    <span
                      className="px-1.5 py-0 rounded text-[10px] font-semibold"
                      style={{ background: 'rgba(200,240,74,0.12)', color: '#C8F04A' }}
                    >
                      {entry.agent}
                    </span>
                    <span style={{ color: '#888' }}>{entry.message}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Completion panel ── */}
      <AnimatePresence>
        {effective === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 rounded-[24px] p-8"
            style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p
                  className="text-[11px] font-semibold tracking-widest uppercase mb-2"
                  style={{ color: '#C8F04A' }}
                >
                  Report ready
                </p>
                <h2 className="text-[22px] font-bold text-white mb-1">Your intelligence report is complete.</h2>
                <p className="text-[13px] text-white/40">
                  Competitive analysis, 3 product concepts, and GTM strategy — ready to download.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 flex-shrink-0">
                <button
                  className="btn btn-lime"
                  onClick={() => navigate(`/reports/${runId}`)}
                >
                  View full report <ArrowLeft size={13} className="rotate-180" />
                </button>
                <div className="flex gap-2">
                  {[
                    { label: 'PDF', url: runData?.report?.pdf_url },
                    { label: 'PPTX', url: runData?.report?.pptx_url },
                  ].map((fmt) => (
                    <a
                      key={fmt.label}
                      href={fmt.url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`btn btn-outline-white btn-sm flex-1 ${!fmt.url ? 'opacity-40 pointer-events-none' : ''}`}
                    >
                      <Download size={12} />
                      {fmt.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Failure panel ── */}
      <AnimatePresence>
        {effective === 'failed' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-[20px] p-6"
            style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <p className="text-[14px] font-semibold text-red-600 mb-1">An agent failed during processing.</p>
            <p className="text-[13px] text-[#6B6B6B] mb-4">{run?.error_message ?? 'Unknown error. Please try again.'}</p>
            <button onClick={() => navigate('/reports/new')} className="btn btn-black btn-sm">
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
