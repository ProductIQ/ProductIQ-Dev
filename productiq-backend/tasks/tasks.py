"""
ProductIQ — CrewAI Task Definitions (All Tasks)
"""

from crewai import Task


def create_scraper_task(agent, product_category: str, brand_name: str, run_id: str) -> Task:
    return Task(
        description=f"""
Scrape product data for category: **{product_category}**
Brand focus: **{brand_name}** and its top 10 competitors.
Run ID: {run_id}

Steps:
1. Search Amazon India for "{product_category}" — scrape top 50 results:
   name, price, MRP, rating, review_count, specs, images, seller info, URL.
2. Search Flipkart for the same category — scrape top 50 results.
3. If {brand_name} has a D2C website, scrape their product catalogue pages.
4. For each product found, extract seller information.
5. Call `Supabase Product Storage` tool to store all records with run_id = {run_id}.
6. Return a JSON summary: total_products_scraped, platforms_covered, price_range, avg_rating.
        """,
        expected_output="JSON summary with total products scraped per platform, price range "
                        "(min/max), avg rating, and confirmation of Supabase storage.",
        agent=agent,
        async_execution=False,
    )


def create_review_task(agent, product_category: str, run_id: str) -> Task:
    return Task(
        description=f"""
Mine and analyse all customer reviews for products in: **{product_category}**
Run ID: {run_id}

Steps:
1. Fetch all scraped products for this run_id from Supabase using the Product Fetcher tool.
2. For each product with a URL, scrape all available reviews (paginate through all pages — max 10 per product).
3. Clean review text (remove HTML, normalise encoding, filter reviews < 10 chars).
4. Run VADER sentiment analysis on each review — store score (-1 to 1) and label.
5. Run spaCy NER to extract product feature mentions and noun chunks.
6. Run BERTopic clustering on the full review corpus — generate 8–15 topic clusters.
7. For each cluster: label it (pain_point / feature_request / praise / neutral),
   get representative words, calculate average sentiment, collect 3 sample reviews.
8. Call `Supabase Review Storage` tool to store all enriched reviews and clusters.
9. Return summary: total_reviews, total_clusters, top_3_pain_points, top_3_praised_features.
        """,
        expected_output="JSON summary with review count, cluster count, top pain points and features.",
        agent=agent,
        async_execution=False,
    )


def create_competitor_task(agent, product_category: str, brand_name: str, run_id: str) -> Task:
    return Task(
        description=f"""
Build a competitor intelligence map for: **{product_category}** | Focus brand: **{brand_name}**
Run ID: {run_id}

Steps:
1. Search Google for "top {product_category} brands India 2024 2025" — identify top 10–15 competitors.
2. For each competitor:
   a. Find their top-selling product on Amazon/Flipkart/D2C.
   b. Extract pricing, rating, review count.
   c. Analyse their homepage for positioning statement and key messaging.
   d. Find their current Google ad copy using SerpAPI.
   e. List key strengths and weaknesses based on review summaries and pricing.
3. Identify product/feature/price gaps that no competitor has filled.
4. Call `Supabase Competitor Storage` tool to store all competitors with run_id = {run_id}.
5. Return JSON: competitors_found, avg_market_price, biggest_gap, price_leader, quality_leader.
        """,
        expected_output="JSON with competitor count, price landscape, identified market gaps, "
                        "price leader, and quality leader.",
        agent=agent,
        async_execution=False,
    )


def create_trend_task(agent, product_category: str, run_id: str) -> Task:
    return Task(
        description=f"""
Identify emerging consumer trends for: **{product_category}**
Run ID: {run_id}

Steps:
1. Use GoogleTrendsTool for the category and 10 related keywords — last 12 months, India geo.
2. Calculate velocity (rising/stable/declining) by comparing last 30 days vs prior 30 days.
3. Find relevant subreddits and top posts mentioning the category on Reddit.
4. Use SerpAPITool to search news articles from last 60 days for category trends.
5. For each trend with velocity = "rising", predict approximate peak month from trajectory.
6. Identify trends that NO competitor has addressed in products or marketing yet.
7. Call `Supabase Trend Storage` tool to store all trends with run_id = {run_id}.
8. Return: top_5_rising_trends, untapped_trend_opportunities, predicted_peaks.
        """,
        expected_output="JSON with rising trends, velocity scores, untapped trend opportunities, "
                        "and peak predictions.",
        agent=agent,
        async_execution=False,
    )


def create_insight_task(agent, product_category: str, run_id: str) -> Task:
    return Task(
        description=f"""
Synthesise all collected intelligence into executive product insights for: **{product_category}**
Run ID: {run_id}

Steps:
1. Fetch from Supabase for run_id {run_id}: all review clusters, competitors, trends, products.
2. Use RAGRetrieverTool to semantically retrieve top 20 most relevant records per question.
3. Generate 10–12 insights. Each MUST have ALL these fields:
   - title: max 10 words, action-oriented
   - body: 200–400 words, evidence-backed (cite exact data points)
   - insight_type: market_gap | consumer_need | competitive_advantage | trend_opportunity | risk
   - confidence_score: 0.0–1.0 based on data evidence strength
   - sources: list of specific data points supporting it
4. Identify top 3 market opportunity gaps:
   - gap description, evidence from reviews, size estimate, why competitors missed it
5. Call `Supabase Insight Storage` tool to store ALL generated insights.
6. Return: insight_count, top_3_opportunity_gaps, overall_market_health_score (0–100).
        """,
        expected_output="JSON with all 10–12 insights, top 3 opportunity gaps, and market health score.",
        agent=agent,
        async_execution=False,
    )


def create_innovator_task(agent, product_category: str, run_id: str) -> Task:
    return Task(
        description=f"""
Generate 3 validated product concepts for: **{product_category}**
Run ID: {run_id}

Steps:
1. Fetch the top 3 opportunity gaps from insights for this run_id.
2. Fetch top pain_point review clusters for unmet needs.
3. Fetch rising trends that are currently untapped by competitors.
4. For each of the 3 concepts, generate ALL these fields (no skipping):
   - concept_name: 3–5 word working product name
   - tagline: 1 compelling, specific sentence (no generic phrases)
   - target_persona: full persona — age range, income tier, location, lifestyle, buying habits, digital channels
   - usp: one precise unique selling proposition (what no competitor offers)
   - key_features: 5–7 specific features tied directly to the pain points found (not generic)
   - suggested_price_inr: specific number with 3-sentence pricing rationale
   - gap_it_fills: which identified gap this addresses and exact mechanism
   - market_size_estimate: TAM/SAM in INR with methodology
   - risks: top 3 specific product/market/regulatory risks
   - name_ideas: 5 creative name options with brief reasoning for each
   - validation_score: 0–100 based on evidence strength (be honest — not everything scores 90+)
5. Call `Supabase Product Concept Storage` tool to store all 3 concepts.
6. Return all 3 concept summaries with validation scores and the top-ranked concept name.
        """,
        expected_output="JSON with 3 complete product concepts including all fields. "
                        "Ranked by validation_score descending.",
        agent=agent,
        async_execution=False,
    )


def create_gtm_task(agent, product_category: str, run_id: str) -> Task:
    return Task(
        description=f"""
Create a complete India-specific go-to-market plan for the top product concept in: **{product_category}**
Run ID: {run_id}

Steps:
1. Fetch the product concept with the highest validation_score for run_id {run_id}.
2. Fetch the target persona and USP from that concept.
3. Generate the complete GTM plan with ALL sections:
   a. launch_channels: ranked list of 5–8 channels with specific ROI rationale for each rank.
      Include: D2C website, Amazon, Flipkart, Instagram, YouTube, Blinkit/Zepto, offline modern trade.
   b. messaging_framework:
      - hero_message: 1 headline that captures the USP in 8 words max
      - 3 proof points: specific, data-backed
      - 3 objection_handlers: anticipate top customer doubts with counter-evidence
      - call_to_action: 1 specific CTA
   c. pricing_strategy: launch price, regular price, bundle options, 3-month promotional calendar
   d. influencer_targets: 5–10 specific influencer archetypes by tier (nano/micro/macro)
      with category rationale, estimated fee range, and expected reach
   e. launch_timeline: 90-day week-by-week milestone plan
      (pre-launch weeks 1–4, launch week 5, growth weeks 6–13)
   f. budget_estimate: percentage breakdown for ₹5L and ₹20L budget scenarios
4. Call `Supabase GTM Plan Storage` tool to store the GTM plan.
5. Return: top_channel, hero_message, launch_week_target, primary_budget_split.
        """,
        expected_output="JSON with complete GTM plan including all 6 sections specified above.",
        agent=agent,
        async_execution=False,
    )


def create_report_task(agent, run_id: str, user_id: str, is_watermarked: bool = False) -> Task:
    return Task(
        description=f"""
Build a comprehensive executive report for run_id: {run_id}
User ID: {user_id} | Watermarked: {is_watermarked}

Steps:
1. Fetch ALL agent outputs for run_id {run_id} from Supabase:
   products, review_clusters, reviews (top 100 by sentiment), competitors,
   trends, insights, product_concepts, gtm_plans.
2. Generate PDF report using WeasyPrint + Jinja2 template (templates/report.html). Sections:
   - Cover page: brand, category, date, "Powered by ProductIQ"
   - Executive Summary: top 5 insights (1 page)
   - Market Overview: product landscape, price range, avg ratings, platform breakdown
   - Consumer Intelligence: top clusters, pain points, feature requests, sentiment pie
   - Competitive Landscape: competitor comparison table, gap analysis
   - Trend Analysis: rising trends, untapped opportunities
   - Product Concepts: all 3 concepts with full detail
   - Go-To-Market Strategy: complete GTM plan
   - Appendix: methodology, data sources, agent pipeline steps
3. Generate PowerPoint (20–25 slides) using python-pptx covering same sections.
4. If is_watermarked = {is_watermarked}: add "ProductIQ Free Report — productiq.in" watermark.
5. Upload both files to Supabase Storage bucket "reports/{user_id}/{run_id}/".
6. Create signed URLs valid for 7 days (604800 seconds).
7. Call `Supabase Report Record Storage` tool to save the report record containing the URLs.
8. Return: pdf_url, pptx_url, page_count, slide_count, file sizes.
        """,
        expected_output="JSON with signed PDF and PPTX download URLs, page count, and report metadata.",
        agent=agent,
        async_execution=False,
    )


def create_sentiment_task(agent, brand_name: str, user_id: str) -> Task:
    return Task(
        description=f"""
Run daily brand health check for brand: **{brand_name}**
User ID: {user_id}

Steps:
1. Search Google for "{brand_name} reviews complaints praise 2025" using SerpAPITool.
2. Search Reddit for "{brand_name}" mentions in India-relevant subreddits.
3. Collect up to 50 recent text snippets mentioning the brand.
4. Run SentimentAnalysisTool on all snippets.
5. Calculate aggregate score: weighted average of individual scores.
   Also compute: positive_pct, negative_pct, neutral_pct, post_count.
6. Store a new row to `sentiment_scores` table (triggers Supabase Realtime update).
7. If new score is more than 0.15 below the 7-day average, send Slack alert via SlackAlertTool.
8. Return: brand_name, score, positive_pct, negative_pct, post_count, alert_sent.
        """,
        expected_output="JSON with brand sentiment score, breakdown percentages, and alert status.",
        agent=agent,
        async_execution=False,
    )


def create_price_task(agent, run_id: str) -> Task:
    return Task(
        description=f"""
Run daily price intelligence for all tracked products in run_id: {run_id}

Steps:
1. Fetch all products for run_id {run_id} from Supabase.
2. For each product, re-scrape current price from Amazon and Flipkart.
3. Store new price records to `price_history` table.
4. Fetch price history for last 90 days for each product.
5. Run ElasticityModelTool on price vs review_count data to find optimal price point.
6. Identify any competitor that changed price by more than 10% since last check.
7. Generate price intelligence summary:
   - current_market_min_price
   - current_market_max_price
   - recommended_price (from elasticity model)
   - price_movers: brands that changed price, direction, magnitude
   - pricing_opportunity: price gap where no competitor is currently positioned
8. Return the full summary JSON.
        """,
        expected_output="JSON with price intelligence summary, elasticity-derived optimal price, "
                        "and competitor price movers.",
        agent=agent,
        async_execution=False,
    )


def create_supply_task(agent, concept_id: str, run_id: str) -> Task:
    return Task(
        description=f"""
Find and qualify manufacturers for product concept_id: {concept_id}
Run ID: {run_id}

Steps:
1. Fetch the product concept from Supabase using concept_id {concept_id}.
2. Extract category, key_features, and certification requirements.
3. Search IndiaMart for manufacturers: use concept name and category as search terms.
4. For each potential supplier found (aim for 10+):
   - Assess credibility: verified badge, review count, years on platform
   - Note: location, contact, MOQ, price range
   - Check for certifications: FSSAI, ISO, GMP, BIS
5. Shortlist the top 5–8 suppliers.
6. Generate an RFQ PDF for each shortlisted supplier using RFQGeneratorTool.
7. Store all suppliers to `suppliers` table with rfq_generated = True.
8. Return: suppliers_found, shortlisted_count, rfq_generated_count.
        """,
        expected_output="JSON with supplier list, shortlisted count, and RFQ generation confirmation.",
        agent=agent,
        async_execution=False,
    )


def create_compliance_task(agent, concept_id: str, run_id: str) -> Task:
    return Task(
        description=f"""
Check regulatory compliance for product concept_id: {concept_id}
Run ID: {run_id}

Steps:
1. Fetch the product concept from Supabase.
2. For EACH regulatory body (FSSAI, AYUSH, BIS, FDA if applicable):
   a. Use RAGRetrieverTool to search regulations relevant to this product type.
   b. Generate a compliance checklist with items: pass | fail | needs_review.
   c. Identify specific risk flags (e.g., "Health claim requires scientific substantiation").
   d. Provide concrete remediation steps for each fail/needs_review item.
3. Store compliance check to `compliance_checks` table.
4. Return: overall_status (compliant/non_compliant/needs_review), risk_flag_count, checklist_summary.
        """,
        expected_output="JSON with compliance status per regulatory body, risk flags, "
                        "and specific remediation recommendations.",
        agent=agent,
        async_execution=False,
    )
