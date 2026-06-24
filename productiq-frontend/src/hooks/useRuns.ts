// src/hooks/useRuns.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { listReports, getRun, startRun, type RunRequest } from '@/lib/api'

export function useRuns() {
  return useQuery({
    queryKey: ['runs'],
    queryFn:  listReports,
  })
}

export function useRun(runId: string | null) {
  return useQuery({
    queryKey: ['run', runId],
    queryFn:  () => getRun(runId!),
    enabled:  !!runId,
    refetchInterval: (query) => {
      const status = query.state.data?.run?.status
      if (status === 'running' || status === 'queued') return 5000
      return false
    },
  })
}

export function useStartRun() {
  const navigate      = useNavigate()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: (payload: RunRequest) => startRun(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['runs'] })
      navigate(`/reports/${data.run_id}/status`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to start report: ${error.message}`)
    },
  })
}
