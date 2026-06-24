// src/hooks/useRealtimeSentiment.ts
import { useState } from 'react'

export interface SentimentScore {
  id: string
  brand_name: string
  platform: string
  score: number
  positive_pct: number
  negative_pct: number
  neutral_pct: number
  post_count: number
  scored_at: string
}

interface UseRealtimeSentimentReturn {
  latestScore: SentimentScore | null
  scoreHistory: SentimentScore[]
  isConnected: boolean
}

/**
 * Stub hook for Supabase Realtime sentiment subscription.
 * Returns pre-seeded mock data until the backend is connected.
 */
export function useRealtimeSentiment(_userId?: string): UseRealtimeSentimentReturn {
  // Mock history for UI demo
  const [scoreHistory] = useState<SentimentScore[]>(() => {
    const now = Date.now()
    return Array.from({ length: 30 }, (_, i) => ({
      id: `mock-${i}`,
      brand_name: 'YourBrand',
      platform: ['amazon', 'reddit', 'twitter'][i % 3],
      score: 0.4 + Math.sin(i * 0.4) * 0.3,
      positive_pct: 55 + Math.round(Math.sin(i * 0.3) * 15),
      negative_pct: 20 + Math.round(Math.cos(i * 0.3) * 8),
      neutral_pct: 25,
      post_count: 80 + i * 3,
      scored_at: new Date(now - (29 - i) * 86400000).toISOString(),
    }))
  })

  const latestScore = scoreHistory[scoreHistory.length - 1] ?? null

  return { latestScore, scoreHistory, isConnected: false }
}
