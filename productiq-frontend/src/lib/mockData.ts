// src/lib/mockData.ts
// ─────────────────────────────────────────────────────────────────────────────
// Comprehensive mock data for ProductIQ v2 frontend (all new pages)
// Simulates real-time events, brand profiles, chat, compare, validate, notifs
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

export type IntelEventType =
  | 'alert.competitor_launch'
  | 'alert.price_change'
  | 'alert.sentiment_drop'
  | 'alert.trend_breakout'
  | 'intelligence.insight_ready'
  | 'intelligence.concepts_ready'
  | 'intelligence.market_size'
  | 'run.completed'
  | 'run.started'

export type Severity = 'info' | 'warning' | 'critical'

export interface IntelEvent {
  id: string
  type: IntelEventType
  severity: Severity
  title: string
  body: string
  brandId: string
  brandName: string
  timestamp: string
  isRead: boolean
  payload?: Record<string, unknown>
}

export interface BrandProfile {
  id: string
  brandName: string
  productCategory: string
  targetMarket: string
  monitoringEnabled: boolean
  trackingSince: string
  lastFullRunAt: string
  healthScore: number
  healthDelta: number
  sentimentTrend: number[]
  priceTrend: number[]
  competitors: string[]
  alertThresholds: {
    sentimentDrop: number
    priceChange: number
    mentionSpike: number
  }
  plan: 'free' | 'starter' | 'pro' | 'team' | 'enterprise'
  totalRuns: number
  totalInsights: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  citations?: { text: string; source: string }[]
}

export interface ChatSession {
  id: string
  runId: string
  brandName: string
  category: string
  messages: ChatMessage[]
  createdAt: string
}

export interface RunDelta {
  id: string
  baseRunId: string
  compareRunId: string
  baseName: string
  compareName: string
  createdAt: string
  newInsights: { id: string; type: string; text: string; impact: 'high' | 'medium' | 'low' }[]
  removedInsights: string[]
  competitorChanges: { name: string; change: string; type: 'entry' | 'exit' | 'price' | 'launch' }[]
  trendVelocityChanges: { trend: string; before: number; after: number; delta: number }[]
  priceShifts: { product: string; before: number; after: number; pct: number }[]
  summary: string
}

export interface ConceptValidation {
  id: string
  conceptName: string
  description: string
  price: number
  targetUser: string
  validatedAgainst: string
  status: 'pending' | 'running' | 'complete'
  score: number
  dimensions: {
    name: string
    score: number
    evidence: string
    verdict: 'strong' | 'moderate' | 'weak'
  }[]
  recommendation: string
}

export interface NotificationItem {
  id: string
  type: IntelEventType
  severity: Severity
  title: string
  body: string
  brandName: string
  brand: string
  category: string
  timestamp: string
  isRead: boolean
  actionUrl?: string
  actionLabel?: string
}

// Alias used in NotificationsPage
export type Notification = NotificationItem

// ── Validation result returned after scoring ─────────────────────────────────
export interface ValidationResult {
  overallScore: number
  marketFitScore: number
  priceFitScore: number
  competitiveScore: number
  summary: string
  dimensions: {
    name: string
    score: number
    summary: string
  }[]
  keyRisks: string[]
  opportunities: string[]
  recommendation: string
}

// ── Mock Intelligence Events ──────────────────────────────────────────────────

export const MOCK_INTEL_EVENTS: IntelEvent[] = [
  {
    id: 'evt-001',
    type: 'alert.competitor_launch',
    severity: 'critical',
    title: 'Mamaearth launched SPF 50+ Vitamin C Serum at ₹549',
    body: 'New product detected on Amazon. Positioned directly against your Whey + Vitamin stack. Threat score: 8/10. The product is already ranking in top 20 for "vitamin c serum india" with 200+ early reviews.',
    brandId: 'brand-001',
    brandName: 'ProteinX',
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    isRead: false,
    payload: { product_url: '#', price: 549, threat_score: 8, platform: 'Amazon' },
  },
  {
    id: 'evt-002',
    type: 'alert.price_change',
    severity: 'warning',
    title: 'MuscleBlaze Whey dropped ₹280 on Flipkart',
    body: 'MuscleBlaze 2kg Whey Protein dropped from ₹3,799 to ₹3,519 (−7.4%). This is the 3rd consecutive price drop in 14 days, possibly indicating over-inventory clearance or a new pricing strategy ahead of a product refresh.',
    brandId: 'brand-001',
    brandName: 'ProteinX',
    timestamp: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
    isRead: false,
    payload: { competitor: 'MuscleBlaze', before: 3799, after: 3519, pct: -7.4 },
  },
  {
    id: 'evt-003',
    type: 'alert.trend_breakout',
    severity: 'warning',
    title: 'Trend breakout: "Plant-based protein India" +312% velocity',
    body: 'Trend velocity for "plant-based protein india" has exceeded the 7-day average by 312%. Currently entering the breakout phase. Competitors in this space: Oziva, Boldfit. Estimated mainstream adoption: 6–8 weeks.',
    brandId: 'brand-001',
    brandName: 'ProteinX',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    isRead: true,
    payload: { trend: 'plant-based protein india', velocity: 312, competitors: ['Oziva', 'Boldfit'] },
  },
  {
    id: 'evt-004',
    type: 'intelligence.insight_ready',
    severity: 'info',
    title: '4 new insights from your Whey Protein run',
    body: 'Agent 5 completed synthesis of 847 reviews and 18 competitor SKUs. Top finding: Zero certified sugar-free options in the top-10 — a significant white space opportunity. Full insights ready in your report.',
    brandId: 'brand-001',
    brandName: 'ProteinX',
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    isRead: true,
    payload: { run_id: 'mock-run-001', insight_count: 4 },
  },
  {
    id: 'evt-005',
    type: 'alert.sentiment_drop',
    severity: 'warning',
    title: 'Sentiment drop detected for Face Serum category',
    body: 'Brand sentiment for the face serum category dropped −0.14 points in the last 24h. Primary driver: 23 new negative reviews mentioning "breakout" and "irritation" on Nykaa. Investigate ingredient formulation claims.',
    brandId: 'brand-002',
    brandName: 'GlowLabs',
    timestamp: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    isRead: false,
    payload: { sentiment_before: 0.62, sentiment_after: 0.48, delta: -0.14 },
  },
  {
    id: 'evt-006',
    type: 'intelligence.market_size',
    severity: 'info',
    title: 'Market size estimate complete: Face Serum India = ₹4,200 Cr TAM',
    body: 'Agent 14 completed market sizing for Face Serums India. TAM: ₹4,200 Cr. SAM (D2C + premium): ₹1,100 Cr. SOM (Year 1 realistic): ₹12–28 Cr. CAGR 2024–2029: 22%. Full breakdown in your report.',
    brandId: 'brand-002',
    brandName: 'GlowLabs',
    timestamp: new Date(Date.now() - 1000 * 60 * 310).toISOString(),
    isRead: true,
    payload: { tam: 4200, sam: 1100, som_low: 12, som_high: 28 },
  },
  {
    id: 'evt-007',
    type: 'run.completed',
    severity: 'info',
    title: 'Report complete: Ayurvedic Hair Oil — India',
    body: 'Your full intelligence report for Ayurvedic Hair Oil is ready. 12 agents ran in 9m 42s. 6 product concepts generated, GTM plan finalized, compliance check passed.',
    brandId: 'brand-003',
    brandName: 'VedaRoots',
    timestamp: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    isRead: true,
    payload: { run_id: 'mock-run-003', duration: 582, pdf_url: '#' },
  },
  {
    id: 'evt-008',
    type: 'alert.competitor_launch',
    severity: 'warning',
    title: 'Biotique launched Ashwagandha Hair Serum — directly in your category',
    body: 'Biotique listed a new Ashwagandha + Bhringraj Hair Serum at ₹349 on Amazon and Flipkart. Early traction: 2,100 units sold in 72 hours. Review score: ★4.2. This directly overlaps with your planned product Concept #3.',
    brandId: 'brand-003',
    brandName: 'VedaRoots',
    timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    isRead: false,
    payload: { product_url: '#', price: 349, platform: 'Amazon + Flipkart', units_sold: 2100 },
  },
  {
    id: 'evt-009',
    type: 'intelligence.concepts_ready',
    severity: 'info',
    title: '5 product concepts generated for Protein Bar category',
    body: 'Agent 6 generated 5 product innovation concepts. Top concept: "Ashwagandha + Whey Protein Bar, certified sugar-free, 30g protein" — validated against 3 market gaps. Validation score: 87/100.',
    brandId: 'brand-001',
    brandName: 'ProteinX',
    timestamp: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    isRead: true,
    payload: { concept_count: 5, top_score: 87 },
  },
  {
    id: 'evt-010',
    type: 'alert.trend_breakout',
    severity: 'info',
    title: 'Trend: "Collagen + hyaluronic serum" entering growth phase',
    body: 'Google Trends velocity for "collagen hyaluronic serum" is up +180% YoY and currently at 67/100 interest. Still in early-majority adoption phase — 4–8 weeks before saturation. Consider this for your next product concept.',
    brandId: 'brand-002',
    brandName: 'GlowLabs',
    timestamp: new Date(Date.now() - 1000 * 60 * 900).toISOString(),
    isRead: true,
    payload: { trend: 'collagen hyaluronic serum', velocity: 180, interest: 67 },
  },
]

// ── Mock Brand Profiles ───────────────────────────────────────────────────────

export const MOCK_BRANDS: BrandProfile[] = [
  {
    id: 'brand-001',
    brandName: 'ProteinX',
    productCategory: 'Whey Protein & Supplements',
    targetMarket: 'India — Tier 1 & 2',
    monitoringEnabled: true,
    trackingSince: '2026-01-15T00:00:00Z',
    lastFullRunAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    healthScore: 0.71,
    healthDelta: +0.06,
    sentimentTrend: [0.58, 0.61, 0.63, 0.67, 0.70, 0.68, 0.71],
    priceTrend: [3200, 3100, 3050, 3100, 3200, 3150, 3100],
    competitors: ['MuscleBlaze', 'Optimum Nutrition', 'MyProtein', 'Nakpro'],
    alertThresholds: { sentimentDrop: 10, priceChange: 8, mentionSpike: 50 },
    plan: 'pro',
    totalRuns: 7,
    totalInsights: 31,
  },
  {
    id: 'brand-002',
    brandName: 'GlowLabs',
    productCategory: 'Face Serum & Skincare',
    targetMarket: 'India — Pan India D2C',
    monitoringEnabled: true,
    trackingSince: '2026-02-03T00:00:00Z',
    lastFullRunAt: new Date(Date.now() - 1000 * 60 * 310).toISOString(),
    healthScore: 0.48,
    healthDelta: -0.14,
    sentimentTrend: [0.62, 0.64, 0.60, 0.58, 0.55, 0.51, 0.48],
    priceTrend: [599, 599, 649, 649, 599, 549, 549],
    competitors: ['Minimalist', 'Mamaearth', 'Plum', 'Dot & Key'],
    alertThresholds: { sentimentDrop: 8, priceChange: 10, mentionSpike: 40 },
    plan: 'pro',
    totalRuns: 4,
    totalInsights: 19,
  },
  {
    id: 'brand-003',
    brandName: 'VedaRoots',
    productCategory: 'Ayurvedic Hair Care',
    targetMarket: 'India — Tier 2 & 3',
    monitoringEnabled: false,
    trackingSince: '2026-03-20T00:00:00Z',
    lastFullRunAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    healthScore: 0.63,
    healthDelta: +0.02,
    sentimentTrend: [0.55, 0.58, 0.60, 0.62, 0.64, 0.63, 0.63],
    priceTrend: [349, 349, 349, 399, 399, 399, 349],
    competitors: ['Biotique', 'Kesh King', 'Indulekha', 'WOW Skin Science'],
    alertThresholds: { sentimentDrop: 12, priceChange: 15, mentionSpike: 60 },
    plan: 'starter',
    totalRuns: 2,
    totalInsights: 11,
  },
]

// ── Mock Chat Sessions ────────────────────────────────────────────────────────

export const MOCK_CHAT_SESSIONS: ChatSession[] = [
  {
    id: 'chat-001',
    runId: 'mock-run-001',
    brandName: 'ProteinX',
    category: 'Whey Protein',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    messages: [
      {
        id: 'msg-001',
        role: 'user',
        content: 'Why are customers unhappy with the packaging?',
        timestamp: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
      },
      {
        id: 'msg-002',
        role: 'assistant',
        content: `Based on 127 reviews in **Review Cluster #4 (Packaging Complaints)**, customers have three primary issues:\n\n**1. Scoop accessibility** — 48% of complaints mention the scoop being buried at the bottom or absent from the first use. This creates a negative unboxing experience.\n\n**2. Seal quality** — 31% report the foil seal either being pre-torn on delivery or failing to reseal properly after opening, causing clumping.\n\n**3. Size perception** — 21% feel the 1kg bag appears underfilled due to nitrogen-flushed headspace, creating a "I was cheated" reaction even when the weight is correct.\n\n**Competitive benchmark:** MuscleBlaze uses a hard container with a secure lid and a sealed scoop pouch — this consistently receives 4.5★ for packaging vs your 3.1★.`,
        timestamp: new Date(Date.now() - 1000 * 60 * 27).toISOString(),
        citations: [
          { text: '127 reviews, avg ★2.1', source: 'Review Cluster #4: Packaging' },
          { text: 'MuscleBlaze packaging comparison', source: 'Competitor Analysis' },
        ],
      },
      {
        id: 'msg-003',
        role: 'user',
        content: 'What would be the optimal price for Concept #2?',
        timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      },
      {
        id: 'msg-004',
        role: 'assistant',
        content: `For **Concept #2 (Ashwagandha + Whey Blend, 1kg)**, the data suggests:\n\n**Optimal launch price: ₹1,249–₹1,399**\n\nReasoning:\n- Current market leaders in the "adaptogens + protein" category price at ₹1,100–₹1,600\n- Your target segment (urban health-conscious, 22–35) shows willingness-to-pay up to ₹1,500 for functional ingredients\n- Price elasticity analysis: every ₹100 increase above ₹1,400 drops conversion by ~18%\n- **Sweet spot**: ₹1,299 — just below the ₹1,300 psychological barrier, premium positioning vs commodity whey (₹800–₹900)\n\n**Recommended strategy**: Launch at ₹1,399 with an introductory offer of ₹1,199 for first 90 days, then normalize.`,
        timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        citations: [
          { text: 'Price elasticity model from 847 reviews', source: 'Insight Synthesis' },
          { text: 'Competitor pricing matrix', source: 'Price Tracker' },
        ],
      },
    ],
  },
]

// ── Mock Run Deltas ───────────────────────────────────────────────────────────

export const MOCK_DELTAS: RunDelta[] = [
  {
    id: 'delta-001',
    baseRunId: 'mock-run-001',
    compareRunId: 'mock-run-002',
    baseName: 'Whey Protein — Jan 2026',
    compareName: 'Whey Protein — May 2026',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    summary:
      'Significant competitive shift in 4 months: 2 new competitors entered (Nakpro, Boldfit), plant-based trend velocity tripled, and MuscleBlaze has been aggressively cutting prices. The sugar-free opportunity gap identified in January remains uncaptured — still a strong white space.',
    newInsights: [
      {
        id: 'ins-n1',
        type: 'Market Gap',
        text: 'Sugar-free certified segment still 0% of top-10 — gap persisted from Jan run, now even more acute with 3x increase in search volume',
        impact: 'high',
      },
      {
        id: 'ins-n2',
        type: 'Trend',
        text: 'Plant-based protein velocity tripled since Jan (+312%) — Oziva and Boldfit are dominating this space now',
        impact: 'high',
      },
      {
        id: 'ins-n3',
        type: 'Consumer Insight',
        text: 'New pain point emerged: "value for money" overtook "taste" as #1 complaint theme, suggesting price sensitivity increase',
        impact: 'medium',
      },
      {
        id: 'ins-n4',
        type: 'Compliance',
        text: 'FSSAI updated guidance on immunity claims — existing labels may need revision by Q3 2026',
        impact: 'medium',
      },
    ],
    removedInsights: ['Collagen blend trend was early — now entering mainstream, no longer a gap'],
    competitorChanges: [
      { name: 'Nakpro', change: 'Entered top-10 with ₹799 1kg SKU', type: 'entry' },
      { name: 'Boldfit', change: 'Launched plant-based line, 3 new SKUs', type: 'launch' },
      { name: 'MuscleBlaze', change: 'Dropped avg price by ₹280 across range', type: 'price' },
      { name: 'GNC', change: 'Exited Flipkart, now Amazon-exclusive', type: 'exit' },
    ],
    trendVelocityChanges: [
      { trend: 'plant-based protein india', before: 45, after: 182, delta: +304 },
      { trend: 'whey protein sugar free', before: 22, after: 68, delta: +209 },
      { trend: 'collagen protein blend', before: 12, after: 34, delta: +183 },
      { trend: 'mass gainer india', before: 78, after: 61, delta: -22 },
    ],
    priceShifts: [
      { product: 'MuscleBlaze Biozyme Whey 2kg', before: 3799, after: 3519, pct: -7.4 },
      { product: 'Optimum Nutrition Gold Standard 1kg', before: 2999, after: 3199, pct: +6.7 },
      { product: 'MyProtein Impact Whey 1kg', before: 1999, after: 1799, pct: -10.0 },
      { product: 'Nakpro Perform 1kg (NEW)', before: 0, after: 799, pct: 0 },
    ],
  },
]

// ── Mock Concept Validations ──────────────────────────────────────────────────

export const MOCK_VALIDATIONS: ConceptValidation[] = [
  {
    id: 'val-001',
    conceptName: 'AshwaWhey Pro',
    description:
      'A certified sugar-free whey protein with 25g protein per serving, infused with KSM-66 ashwagandha for stress + muscle recovery. Targeted at urban professionals aged 25–38 who work out 3–5x per week.',
    price: 1299,
    targetUser: 'Urban professionals, 25–38, gym-goers',
    validatedAgainst: 'Whey Protein India — May 2026 Run',
    status: 'complete',
    score: 87,
    dimensions: [
      {
        name: 'Market Gap',
        score: 94,
        evidence:
          'Zero certified sugar-free whey in top-10 Amazon SKUs. 2,847 reviews mention "sugar free" as desired feature. Search volume for "sugar free protein powder india" up +209%.',
        verdict: 'strong',
      },
      {
        name: 'Competitive Differentiation',
        score: 88,
        evidence:
          'No direct competitor combines FSSAI-certified sugar-free + KSM-66 ashwagandha. Nearest competitor (Wellbeing Nutrition) lacks sugar-free cert and is priced at ₹2,100+.',
        verdict: 'strong',
      },
      {
        name: 'Trend Alignment',
        score: 85,
        evidence:
          '"Ashwagandha protein" velocity +180% YoY. "Adaptogen protein" on Google Trends at 74/100 interest, in growth phase. Timing is optimal.',
        verdict: 'strong',
      },
      {
        name: 'Price Positioning',
        score: 79,
        evidence:
          'At ₹1,299 for 1kg, the concept is priced in the ₹1,100–₹1,500 sweet spot for functional protein. 18% price drop in conversion expected above ₹1,400.',
        verdict: 'moderate',
      },
      {
        name: 'Regulatory Compliance',
        score: 71,
        evidence:
          'KSM-66 ashwagandha is GRAS-certified but FSSAI requires specific dosage labeling. Sugar-free cert requires third-party lab testing. Both achievable within 45-60 days.',
        verdict: 'moderate',
      },
      {
        name: 'Consumer Sentiment Fit',
        score: 91,
        evidence:
          'Review cluster analysis: "stress + protein" appears in 312 reviews as a combined wish. Urban professional segment shows highest NPS in the 25–38 demographic.',
        verdict: 'strong',
      },
    ],
    recommendation:
      'Strong GO recommendation. The concept directly addresses the highest-volume unmet need (sugar-free certification) with a differentiated functional ingredient. Immediate next step: Procure KSM-66 samples and begin FSSAI certification process. Target launch: Q3 2026.',
  },
]

// ── Mock Agents (20 agents) ───────────────────────────────────────────────────

export const MOCK_AGENTS_20 = [
  { id: 1, name: 'Web Scraper', emoji: '🕷️', desc: 'Scrapes Amazon, Flipkart, D2C sites', status: 'complete', duration: '1m 52s', llm: 'Flash' },
  { id: 2, name: 'Review Miner', emoji: '⛏️', desc: 'Mines & clusters customer reviews', status: 'complete', duration: '2m 41s', llm: 'Flash' },
  { id: 3, name: 'Competitor Intel', emoji: '🔭', desc: 'Maps competitor landscape', status: 'complete', duration: '1m 58s', llm: 'Flash' },
  { id: 4, name: 'Trend Spotter', emoji: '📈', desc: 'Google Trends + Reddit signals', status: 'complete', duration: '1m 34s', llm: 'Flash' },
  { id: 5, name: 'Insight Synthesizer', emoji: '🧠', desc: 'Synthesizes all data into insights', status: 'complete', duration: '2m 12s', llm: 'Pro' },
  { id: 6, name: 'Product Innovator', emoji: '💡', desc: 'Generates product concepts', status: 'complete', duration: '1m 47s', llm: 'Pro' },
  { id: 7, name: 'GTM Strategist', emoji: '🚀', desc: 'Builds go-to-market plans', status: 'complete', duration: '1m 22s', llm: 'Flash' },
  { id: 8, name: 'Report Builder', emoji: '📄', desc: 'Assembles PDF + PPTX report', status: 'complete', duration: '1m 55s', llm: 'Pro' },
  { id: 9, name: 'Sentiment Tracker', emoji: '💬', desc: 'Daily brand sentiment scores', status: 'idle', duration: '', llm: 'Flash' },
  { id: 10, name: 'Price Optimizer', emoji: '💰', desc: 'Tracks competitor price changes', status: 'idle', duration: '', llm: 'Flash' },
  { id: 11, name: 'Supply Chain Scout', emoji: '🏭', desc: 'Refreshes supplier database', status: 'idle', duration: '', llm: 'Flash' },
  { id: 12, name: 'Compliance Guardian', emoji: '⚖️', desc: 'FSSAI & regulatory checks', status: 'idle', duration: '', llm: 'Flash+RAG' },
  { id: 13, name: 'Social Scout', emoji: '📱', desc: 'Instagram, YouTube, X signals', status: 'complete', duration: '2m 08s', llm: 'Flash' },
  { id: 14, name: 'Market Sizer', emoji: '📊', desc: 'TAM/SAM/SOM estimation', status: 'complete', duration: '1m 39s', llm: 'Pro' },
  { id: 15, name: 'Brand Mention Tracker', emoji: '📡', desc: 'Monitors brand mentions every 4h', status: 'running', duration: '', llm: 'Flash' },
  { id: 16, name: 'Competitor Launch Scout', emoji: '🎯', desc: 'Detects new product launches', status: 'idle', duration: '', llm: 'Flash' },
  { id: 17, name: 'Trend Velocity Monitor', emoji: '⚡', desc: 'Trend velocity every 2h', status: 'running', duration: '', llm: 'Flash' },
  { id: 18, name: 'AI Chat Agent', emoji: '🤖', desc: 'RAG-powered Q&A over your data', status: 'idle', duration: '', llm: 'Pro' },
  { id: 19, name: 'Report Comparator', emoji: '🔄', desc: 'Cross-run delta analysis', status: 'idle', duration: '', llm: 'Flash' },
  { id: 20, name: 'Concept Validator', emoji: '✅', desc: 'Validates product ideas vs data', status: 'idle', duration: '', llm: 'Pro' },
]

// ── Notification Mock ─────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  'alert.competitor_launch': 'COMPETITOR',
  'alert.price_change':      'PRICE',
  'alert.sentiment_drop':    'SENTIMENT',
  'alert.trend_breakout':    'ALERT',
  'intelligence.insight_ready':   'REPORT',
  'intelligence.concepts_ready':  'REPORT',
  'intelligence.market_size':     'REPORT',
  'run.completed':           'REPORT',
  'run.started':             'SYSTEM',
}

export const MOCK_NOTIFICATIONS: NotificationItem[] = MOCK_INTEL_EVENTS.map((evt) => ({
  id: evt.id,
  type: evt.type,
  severity: evt.severity,
  title: evt.title,
  body: evt.body,
  brandName: evt.brandName,
  brand: evt.brandName,
  category: CATEGORY_MAP[evt.type] ?? 'SYSTEM',
  timestamp: evt.timestamp,
  isRead: evt.isRead,
  actionLabel:
    evt.type === 'run.completed' || evt.type === 'intelligence.insight_ready'
      ? 'View report'
      : evt.type.startsWith('alert.price')
      ? 'See price tracker'
      : evt.type.startsWith('alert.competitor')
      ? 'Compare runs'
      : undefined,
  actionUrl:
    evt.type === 'run.completed'
      ? `/reports/${(evt.payload?.run_id as string) ?? '#'}`
      : evt.type === 'intelligence.insight_ready'
      ? `/reports/${(evt.payload?.run_id as string) ?? '#'}`
      : undefined,
}))

// ── Validation Result Mock ────────────────────────────────────────────────────

export const MOCK_VALIDATION_RESULT: ValidationResult = {
  overallScore: 87,
  marketFitScore: 91,
  priceFitScore: 79,
  competitiveScore: 88,
  summary:
    'Strong viability. The concept targets the most acute unmet need in the category — a certified sugar-free whey — which has zero representation in the current top-10 SKUs. Differentiation is clear and defensible.',
  dimensions: [
    { name: 'Market gap',               score: 94, summary: 'No certified sugar-free option in top-10 Amazon SKUs. High search volume.' },
    { name: 'Competitive differentiation', score: 88, summary: 'No direct competitor combines sugar-free cert + KSM-66 ashwagandha.' },
    { name: 'Consumer sentiment fit',   score: 91, summary: 'Review analysis shows "stress + protein" appears in 312 reviews as a combined wish.' },
    { name: 'Trend alignment',          score: 85, summary: '"Adaptogen protein" on Google Trends at 74/100 interest, in growth phase.' },
    { name: 'Price positioning',        score: 79, summary: '₹1,299 sits in the sweet spot — premium vs commodity, affordable vs luxury.' },
    { name: 'Regulatory feasibility',   score: 71, summary: 'KSM-66 is GRAS-certified. FSSAI sugar-free cert achievable in 45–60 days.' },
  ],
  keyRisks: [
    'FSSAI certification adds 45–60 day lead time before launch',
    'MuscleBlaze or MyProtein may launch a similar SKU within 3–6 months',
    'Ashwagandha flavour profile can polarise customers — requires blind taste testing',
  ],
  opportunities: [
    'First-mover in certified sugar-free functional whey — large moat if launched before Q3',
    'Strong D2C story: "clean protein, zero compromise" resonates with the 25–38 urban segment',
    'Can extend the concept to protein bars in Phase 2 using the same certification',
  ],
  recommendation:
    'Strong GO. Address regulatory timeline first — start FSSAI certification this week. Begin supplier discussions for KSM-66 samples immediately. Target launch: August 2026.',
}

// ── Suggested Chat Questions ──────────────────────────────────────────────────

export const MOCK_SUGGESTED_QUESTIONS = [
  'Which pain point has the most reviews?',
  'What is the optimal price for Concept #2?',
  'What FSSAI requirement applies to ashwagandha?',
  'Which competitor has the best packaging?',
  'Show me the top 3 unmet consumer needs',
  'What trends should I focus on first?',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getEventColor(type: IntelEventType) {
  if (type.startsWith('alert.competitor')) return { bg: '#fee2e2', text: '#EF4444', dot: '#EF4444', label: 'COMPETITOR' }
  if (type.startsWith('alert.price'))      return { bg: '#FEF3C7', text: '#B45309', dot: '#F59E0B', label: 'PRICE' }
  if (type.startsWith('alert.sentiment'))  return { bg: '#fee2e2', text: '#EF4444', dot: '#EF4444', label: 'SENTIMENT' }
  if (type.startsWith('alert.trend'))      return { bg: '#FEF3C7', text: '#B45309', dot: '#F59E0B', label: 'TREND' }
  if (type.startsWith('intelligence.'))    return { bg: '#f0fdf4', text: '#16A34A', dot: '#22C55E', label: 'INSIGHT' }
  if (type === 'run.completed')            return { bg: '#f7fee7', text: '#4d7c0f', dot: '#C8F04A', label: 'RUN' }
  return { bg: '#F0F2F5', text: '#6B6B6B', dot: '#A3A3A3', label: 'UPDATE' }
}

export function getSeverityConfig(severity: Severity) {
  if (severity === 'critical') return { ring: '#EF4444', pulse: true }
  if (severity === 'warning')  return { ring: '#F59E0B', pulse: false }
  return { ring: '#C8F04A', pulse: false }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
