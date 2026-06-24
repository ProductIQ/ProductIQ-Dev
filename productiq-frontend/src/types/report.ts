// src/types/report.ts

export interface Product {
  id: string
  run_id: string
  platform: string
  product_name: string
  brand: string | null
  category: string | null
  price_inr: number | null
  mrp_inr: number | null
  rating: number | null
  review_count: number | null
  in_stock: boolean
  images: string[]
  url: string | null
  scraped_at: string
}

export interface Review {
  id: string
  product_id: string | null
  run_id: string | null
  platform: string
  reviewer_name: string | null
  rating: number | null
  title: string | null
  body: string
  verified_purchase: boolean
  sentiment_score: number | null
  sentiment_label: 'positive' | 'negative' | 'neutral' | null
  topics: string[]
  pain_points: string[]
  feature_requests: string[]
  reviewed_at: string | null
}

export interface ReviewCluster {
  id: string
  run_id: string
  topic_id: number
  topic_label: string
  topic_type: 'pain_point' | 'feature_request' | 'praise' | 'neutral'
  representative_words: string[]
  review_count: number | null
  avg_sentiment: number | null
  sample_reviews: string[]
}

export interface Competitor {
  id: string
  run_id: string | null
  brand_name: string
  product_name: string | null
  platform: string | null
  price_inr: number | null
  rating: number | null
  review_count: number | null
  key_strengths: string[]
  key_weaknesses: string[]
  positioning_statement: string | null
  url: string | null
}

export interface Trend {
  id: string
  run_id: string | null
  trend_keyword: string
  source: string
  trend_score: number | null
  velocity: 'rising' | 'stable' | 'declining' | null
  peak_predicted_at: string | null
  related_topics: string[]
  sample_posts: string[]
  detected_at: string
}

export interface Insight {
  id: string
  run_id: string
  insight_type: string
  title: string
  body: string
  confidence_score: number | null
  sources: Record<string, unknown> | null
  created_at: string
}

export interface ProductConcept {
  id: string
  run_id: string
  concept_name: string
  tagline: string | null
  target_persona: string | null
  usp: string | null
  key_features: string[]
  suggested_price_inr: number | null
  price_rationale: string | null
  gap_it_fills: string | null
  market_size_estimate: string | null
  risks: string[]
  name_ideas: string[]
  validation_score: number | null
  created_at: string
}

export interface GTMPlan {
  id: string
  run_id: string
  concept_id: string | null
  launch_channels: string[]
  messaging_framework: Record<string, unknown> | null
  pricing_strategy: Record<string, unknown> | null
  influencer_targets: Record<string, unknown> | null
  launch_timeline: Record<string, unknown> | null
  budget_estimate: Record<string, unknown> | null
  created_at: string
}

export interface Report {
  id: string
  run_id: string
  user_id: string
  title: string
  pdf_url: string | null
  pptx_url: string | null
  is_watermarked: boolean
  page_count: number | null
  created_at: string
}
