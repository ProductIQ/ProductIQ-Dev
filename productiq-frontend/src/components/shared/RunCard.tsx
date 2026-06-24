// src/components/shared/RunCard.tsx
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { FileText, CheckCircle2, Loader2, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/Progress'

interface Run {
  id: string
  product_category: string
  brand_name?: string
  target_market?: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress_pct?: number
  created_at: string
}

interface RunCardProps {
  run: Run
  className?: string
}

const STATUS_CONFIG = {
  queued:    { label: 'Queued',    icon: Clock,          color: 'text-[#F59E0B]', bg: 'bg-[#FEF3C7]' },
  running:   { label: 'Running',   icon: Loader2,         color: 'text-[#0A0A0A]', bg: 'bg-[#C8F04A]' },
  completed: { label: 'Completed', icon: CheckCircle2,    color: 'text-[#22C55E]', bg: 'bg-[#dcfce7]' },
  failed:    { label: 'Failed',    icon: AlertCircle,     color: 'text-[#EF4444]', bg: 'bg-[#fee2e2]' },
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function RunCard({ run, className }: RunCardProps) {
  const navigate = useNavigate()
  const cfg = STATUS_CONFIG[run.status]
  const StatusIcon = cfg.icon

  function handleClick() {
    if (run.status === 'running' || run.status === 'queued') {
      navigate(`/reports/${run.id}/status`)
    } else if (run.status === 'completed') {
      navigate(`/reports/${run.id}`)
    }
  }

  return (
    <motion.div
      whileHover={{ y: -1 }}
      onClick={handleClick}
      className={cn(
        'bg-white rounded-[16px] border border-[rgba(0,0,0,0.07)] p-4 cursor-pointer',
        'transition-shadow duration-150 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#F8F9FB] flex items-center justify-center flex-shrink-0 border border-[rgba(0,0,0,0.06)]">
            <FileText size={14} className="text-[#A3A3A3]" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#0A0A0A] truncate">
              {run.product_category}
              {run.brand_name ? ` · ${run.brand_name}` : ''}
            </p>
            <p className="text-[11px] text-[#A3A3A3] mt-0.5">
              {run.target_market ?? 'India'} · {formatRelative(run.created_at)}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <span className={cn(
          'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0',
          cfg.bg, cfg.color,
        )}>
          <StatusIcon size={9} className={cn(run.status === 'running' && 'animate-spin')} />
          {cfg.label}
        </span>
      </div>

      {/* Progress bar for running runs */}
      {(run.status === 'running' || run.status === 'queued') && (
        <div className="mt-3">
          <Progress value={run.progress_pct ?? 0} height={3} />
        </div>
      )}
    </motion.div>
  )
}
