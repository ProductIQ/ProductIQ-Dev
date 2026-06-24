// src/types/agent.ts

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed'
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface AgentOutput {
  id: string
  run_id: string
  agent_name: string
  agent_number: number
  status: AgentStatus
  output: Record<string, unknown> | null
  tokens_used: number | null
  duration_seconds: number | null
  started_at: string | null
  completed_at: string | null
}

export interface AgentRun {
  id: string
  user_id: string
  product_category: string
  brand_name: string | null
  target_market: string
  status: RunStatus
  current_agent: string | null
  progress_pct: number
  error_message: string | null
  celery_task_id: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  // nested
  agent_outputs?: AgentOutput[]
}

export interface StreamEvent {
  type: 'agent_start' | 'agent_complete' | 'agent_fail' | 'progress' | 'done' | 'error'
  agent_name?: string
  agent_number?: number
  progress_pct?: number
  message?: string
  timestamp: string
}

export interface LogEntry {
  timestamp: string
  agent: string
  message: string
}

export const AGENT_DEFINITIONS = [
  { number: 1, name: 'Scraper',         description: 'Scrapes products from Amazon & Flipkart',   icon: '🕷️' },
  { number: 2, name: 'Review Miner',    description: 'Mines 1000+ customer reviews for insights', icon: '💬' },
  { number: 3, name: 'Competitor Intel',description: 'Maps competitor landscape & positioning',    icon: '🔍' },
  { number: 4, name: 'Trend Spotter',   description: 'Identifies rising search & social trends',   icon: '📈' },
  { number: 5, name: 'Insight Synth.',  description: 'Synthesizes all data into key insights',     icon: '🧠' },
  { number: 6, name: 'Innovator',       description: 'Generates 3 validated product concepts',     icon: '💡' },
  { number: 7, name: 'GTM Strategist',  description: 'Crafts go-to-market strategy & timeline',   icon: '🚀' },
  { number: 8, name: 'Report Builder',  description: 'Generates PDF + PPTX report',               icon: '📋' },
  { number: 9, name: 'Sentiment Tracker', description: 'Provides a daily brand health score via Supabase Realtime', icon: '💗' },
  { number: 10, name: 'Price Optimizer',  description: 'Suggests optimal price points using elasticity modeling', icon: '🏷️' },
  { number: 11, name: 'Supply Chain Scout', description: 'Identifies verified manufacturers and labs for RFQs', icon: '🏭' },
  { number: 12, name: 'Compliance Guardian', description: 'Performs RAG over FSSAI, FDA, and AYUSH regulations', icon: '⚖️' },
] as const
