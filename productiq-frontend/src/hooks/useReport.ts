// src/hooks/useReport.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Insight, Competitor, Trend, ProductConcept, GTMPlan, ReviewCluster } from '@/types/report'

export interface ReportData {
  run: {
    id: string
    product_category: string
    brand_name: string | null
    target_market: string | null
    status: string
    created_at: string
    duration_seconds: number | null
  } | null
  insights: Insight[]
  clusters: ReviewCluster[]
  competitors: Competitor[]
  trends: Trend[]
  concepts: ProductConcept[]
  gtmPlans: GTMPlan[]
}

async function fetchReport(runId: string): Promise<ReportData> {
  const [runRes, insightsRes, clustersRes, competitorsRes, trendsRes, conceptsRes, gtmRes] =
    await Promise.all([
      supabase.from('agent_runs').select('*').eq('id', runId).single(),
      supabase.from('insights').select('*').eq('run_id', runId).order('confidence_score', { ascending: false }),
      supabase.from('review_clusters').select('*').eq('run_id', runId),
      supabase.from('competitors').select('*').eq('run_id', runId),
      supabase.from('trends').select('*').eq('run_id', runId).order('trend_score', { ascending: false }),
      supabase.from('product_concepts').select('*').eq('run_id', runId),
      supabase.from('gtm_plans').select('*').eq('run_id', runId),
    ])

  return {
    run: runRes.data ?? null,
    insights: (insightsRes.data ?? []) as Insight[],
    clusters: (clustersRes.data ?? []) as ReviewCluster[],
    competitors: (competitorsRes.data ?? []) as Competitor[],
    trends: (trendsRes.data ?? []) as Trend[],
    concepts: (conceptsRes.data ?? []) as ProductConcept[],
    gtmPlans: (gtmRes.data ?? []) as GTMPlan[],
  }
}

export function useReport(runId: string | undefined) {
  return useQuery<ReportData>({
    queryKey: ['report', runId],
    queryFn: () => fetchReport(runId!),
    enabled: !!runId,
    staleTime: 120_000,
  })
}
