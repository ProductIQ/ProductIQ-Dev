// src/hooks/useReport.ts
// Fetches full report data (run + insights + clusters + competitors + trends + concepts + gtm)
// via the FastAPI backend instead of direct Supabase queries.
import { useQuery } from '@tanstack/react-query'
import { getRun, getInsights, getConcepts, getGtm, getClusters, getCompetitors } from '@/lib/api'
import type { Insight, Competitor, ProductConcept, GTMPlan, ReviewCluster } from '@/types/report'

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
  report: {
    id: string
    run_id: string
    title: string
    pdf_url: string | null
    pptx_url: string | null
    is_watermarked: boolean
    page_count: number | null
    created_at: string
  } | null
  insights: Insight[]
  clusters: ReviewCluster[]
  competitors: Competitor[]
  trends: unknown[]
  concepts: ProductConcept[]
  gtmPlans: GTMPlan[]
}

async function fetchReport(runId: string): Promise<ReportData> {
  const [runData, insights, concepts, gtmPlans, clusters, competitors] = await Promise.all([
    getRun(runId),
    getInsights(runId).catch(() => []),
    getConcepts(runId).catch(() => []),
    getGtm(runId).catch(() => []),
    getClusters(runId).catch(() => []),
    getCompetitors(runId).catch(() => []),
  ])

  return {
    run: runData.run
      ? {
          id: runData.run.id,
          product_category: runData.run.product_category,
          brand_name: runData.run.brand_name,
          target_market: runData.run.target_market,
          status: runData.run.status,
          created_at: runData.run.created_at,
          duration_seconds: null,
        }
      : null,
    report: runData.report ?? null,
    insights: insights as Insight[],
    clusters: clusters as ReviewCluster[],
    competitors: competitors as Competitor[],
    trends: [],
    concepts: concepts as ProductConcept[],
    gtmPlans: gtmPlans as GTMPlan[],
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
