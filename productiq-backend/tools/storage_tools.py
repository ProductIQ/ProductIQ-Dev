"""
ProductIQ — Supabase Storage Tools
All agent write/read tools for Supabase tables.

IMPORTANT: Every tool class must be a standalone, properly-defined BaseTool subclass.
"""

import json
import httpx
from crewai.tools import BaseTool
from database import get_supabase
from config import settings
import structlog

logger = structlog.get_logger()


# ── Known DB schema columns (ONLY these keys are passed to Supabase) ──────────

_PRODUCT_COLUMNS = {
    "run_id", "platform", "product_name", "brand", "category", "sub_category",
    "price_inr", "mrp_inr", "rating", "review_count", "in_stock", "images",
    "url", "specs", "seller_info", "asin",
}

_REVIEW_COLUMNS = {
    "run_id", "product_id", "platform", "reviewer_name", "rating", "title",
    "body", "verified_purchase", "helpful_votes", "sentiment_score",
    "sentiment_label", "topics", "pain_points", "feature_requests",
    "reviewed_at", "asin",
}

_COMPETITOR_COLUMNS = {
    "run_id", "brand_name", "product_name", "platform", "price_inr", "rating",
    "review_count", "key_strengths", "key_weaknesses", "positioning_statement",
    "ad_copy", "url",
}

_TREND_COLUMNS = {
    "run_id", "trend_keyword", "source", "trend_score", "velocity",
    "peak_predicted_at", "related_topics", "sample_posts",
}

_CONCEPT_COLUMNS = {
    "run_id", "concept_name", "tagline", "target_persona", "usp",
    "key_features", "suggested_price_inr", "price_rationale", "gap_it_fills",
    "market_size_estimate", "risks", "name_ideas", "validation_score",
}

_INSIGHT_COLUMNS = {
    "run_id", "insight_type", "title", "body", "confidence_score", "sources", "tags",
}

_GTM_COLUMNS = {
    "run_id", "concept_id", "launch_channels", "messaging_framework",
    "pricing_strategy", "influencer_targets", "launch_timeline", "budget_estimate",
}


def _parse_json(json_str: str):
    """Robustly parse JSON, stripping markdown codeblocks and handling trailing data."""
    if not isinstance(json_str, str):
        return json_str
    
    json_str = json_str.strip()
    if json_str.startswith("```"):
        lines = json_str.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        json_str = "\n".join(lines).strip()
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        if "Extra data" in str(e):
            # Try to slice up to the error position
            end_idx = e.pos
            try:
                return json.loads(json_str[:end_idx])
            except Exception:
                pass
        raise


def _parse_number(val):
    """Safely extract numbers from LLM outputs, including currency dicts like {"currency": "INR", "value": 100}."""
    if isinstance(val, dict):
        val = val.get("value") or val.get("amount")
    try:
        if val is not None:
            # Strip formatting like commas or currency symbols if it's a string
            if isinstance(val, str):
                import re
                cleaned = re.sub(r'[^\d.]', '', val)
                return float(cleaned) if cleaned else None
            return float(val)
    except (ValueError, TypeError):
        pass
    return None


def _sanitize(record: dict, allowed: set) -> dict:
    """Strip keys not in the DB schema and coerce common type issues."""
    out = {}
    for k, v in record.items():
        if k not in allowed:
            continue
        # Convert sets to lists (Supabase arrays must be lists)
        if isinstance(v, set):
            v = list(v)
        out[k] = v
    return out


def _insert_records(table: str, records: list, run_id: str | None = None) -> dict:
    """Insert a list of dicts into a Supabase table, injecting run_id if provided."""
    db = get_supabase()
    if run_id:
        for r in records:
            if isinstance(r, dict):
                r["run_id"] = run_id
    result = db.table(table).insert(records).execute()
    count = len(result.data) if result.data else 0
    return {"stored": count, "table": table}


def _fetch_records(table: str, run_id: str, limit: int = 1000) -> list:
    """Fetch records from a Supabase table for a given run_id."""
    db = get_supabase()
    result = (
        db.table(table)
        .select("*")
        .eq("run_id", run_id)
        .limit(limit)
        .execute()
    )
    return result.data or []


# ── Tool 1: Product Fetch ─────────────────────────────────────────────────────

class SupabaseProductFetchTool(BaseTool):
    """Fetch scraped products for a run — used by Agent 2 to get URLs for review scraping."""

    name: str = "Supabase Product Fetcher"
    description: str = (
        "Fetches all scraped products for a run_id from the Supabase 'products' table. "
        "Returns a JSON list of product dicts including URLs for review scraping. "
        "Input: run_id (string UUID)."
    )

    def _run(self, run_id: str) -> str:
        try:
            products = _fetch_records("products", run_id)
            logger.info("Products fetched", run_id=run_id, total=len(products))
            return json.dumps({"products": products, "total": len(products), "run_id": run_id})
        except Exception as e:
            logger.error("SupabaseProductFetchTool error", run_id=run_id, error=str(e))
            return json.dumps({"error": str(e), "products": [], "total": 0})


# ── Tool 2: Product Store ─────────────────────────────────────────────────────

class SupabaseStoreTool(BaseTool):
    """Store scraped products to Supabase — used by Agent 1 after scraping."""

    name: str = "Supabase Product Storage"
    description: str = (
        "Stores a list of scraped products to the Supabase 'products' table. "
        "Input: products_json (JSON string — list of product dicts or dict with 'products' key), "
        "run_id (string UUID)."
    )

    def _run(self, products_json: str, run_id: str) -> str:
        try:
            data = _parse_json(products_json)
            products = data.get("products", data) if isinstance(data, dict) else data
            if not isinstance(products, list):
                products = [products]

            # Clean and validate each product row
            clean_products = []
            for p in products:
                if not isinstance(p, dict):
                    continue
                # review_count must be int (not float) — DB column is INTEGER
                rc = _parse_number(p.get("review_count"))
                review_count_int = int(rc) if rc is not None else None

                clean = _sanitize({
                    "run_id": run_id,
                    "platform": p.get("platform", "unknown"),
                    "product_name": str(p.get("product_name") or p.get("name") or "")[:500],
                    "brand": str(p.get("brand") or "")[:200] or None,
                    "category": str(p.get("category") or "")[:200] or None,
                    "sub_category": str(p.get("sub_category") or "")[:200] or None,
                    "price_inr": _parse_number(p.get("price_inr")),
                    "mrp_inr": _parse_number(p.get("mrp_inr")),
                    "rating": _parse_number(p.get("rating")),
                    "review_count": review_count_int,
                    "in_stock": p.get("in_stock"),  # bool or None
                    "url": str(p.get("url") or "")[:2000] or None,
                    "asin": str(p.get("asin") or "")[:20] or None,
                    "images": p.get("images") or [],
                    "specs": p.get("specs"),
                    "seller_info": p.get("seller_info"),
                }, _PRODUCT_COLUMNS)

                if not clean.get("product_name"):
                    continue  # Skip products with no name — can't insert null

                clean_products.append(clean)

            if not clean_products:
                return json.dumps({"stored": 0, "run_id": run_id, "warning": "No valid products to store"})

            result = _insert_records("products", clean_products)
            logger.info("Products stored", **result, run_id=run_id)
            return json.dumps({**result, "run_id": run_id})
        except Exception as e:
            logger.error("SupabaseStoreTool error", run_id=run_id, error=str(e))
            return json.dumps({"error": str(e), "stored": 0})



# ── Tool 3: Review Storage ────────────────────────────────────────────────────

class SupabaseReviewStoreTool(BaseTool):
    """Store enriched reviews and BERTopic clusters — used by Agent 2."""

    name: str = "Supabase Review Storage"
    description: str = (
        "Stores enriched reviews and BERTopic clusters to Supabase. "
        "Input: reviews_json (JSON string of enriched review list), "
        "clusters_json (JSON string of cluster list), run_id (string UUID)."
    )

    def _run(self, reviews_json: str, clusters_json: str, run_id: str) -> str:
        try:
            db = get_supabase()

            reviews = _parse_json(reviews_json)
            clusters = _parse_json(clusters_json)

            if isinstance(reviews, dict):
                reviews = reviews.get("enriched_reviews", reviews.get("reviews", []))
            if isinstance(clusters, dict):
                clusters = clusters.get("clusters", [])

            clean_reviews = []
            for r in reviews:
                if not isinstance(r, dict):
                    continue
                clean = _sanitize({
                    "run_id": run_id,
                    "platform": r.get("platform", "amazon_india"),
                    "asin": r.get("asin"),
                    "reviewer_name": r.get("reviewer_name"),
                    "rating": r.get("rating"),
                    "title": str(r.get("title") or "")[:500],
                    "body": str(r.get("body") or "")[:5000],
                    "verified_purchase": bool(r.get("verified_purchase", False)),
                    "helpful_votes": int(_parse_number(r.get("helpful_votes")) or 0),
                    "sentiment_score": _parse_number(r.get("sentiment_score")),
                    "sentiment_label": r.get("sentiment_label"),
                    "reviewed_at": r.get("reviewed_at"),
                }, _REVIEW_COLUMNS)
                clean_reviews.append(clean)

            review_result = db.table("reviews").insert(clean_reviews).execute() if clean_reviews else None
            reviews_stored = len(review_result.data) if review_result and review_result.data else 0

            clean_clusters = []
            for c in clusters:
                if not isinstance(c, dict):
                    continue
                clean_clusters.append({
                    "run_id": run_id,
                    "topic_id": c.get("topic_id", 0),
                    "topic_label": str(c.get("topic_label") or "")[:200],
                    "topic_type": c.get("topic_type", "neutral"),
                    "representative_words": c.get("representative_words", []),
                    "review_count": int(c.get("review_count") or 0),
                    "avg_sentiment": c.get("avg_sentiment"),
                    "sample_reviews": c.get("sample_reviews", []),
                })

            cluster_result = db.table("review_clusters").insert(clean_clusters).execute() if clean_clusters else None
            clusters_stored = len(cluster_result.data) if cluster_result and cluster_result.data else 0

            logger.info("Reviews stored", run_id=run_id, reviews=reviews_stored, clusters=clusters_stored)
            return json.dumps({
                "reviews_stored": reviews_stored,
                "clusters_stored": clusters_stored,
                "run_id": run_id,
            })
        except Exception as e:
            logger.error("SupabaseReviewStoreTool error", run_id=run_id, error=str(e))
            return json.dumps({"error": str(e), "reviews_stored": 0, "clusters_stored": 0})


# ── Tool 4: Competitor Storage ────────────────────────────────────────────────

class SupabaseCompetitorStoreTool(BaseTool):
    """Store competitor data — used by Agent 3."""

    name: str = "Supabase Competitor Storage"
    description: str = (
        "Stores competitor data to the Supabase 'competitors' table. "
        "Input: competitors_json (JSON list of competitor dicts), run_id (string UUID)."
    )

    def _run(self, competitors_json: str, run_id: str) -> str:
        try:
            data = _parse_json(competitors_json)
            competitors = data.get("competitors", data) if isinstance(data, dict) else data
            if not isinstance(competitors, list):
                competitors = [competitors]
            
            clean_competitors = []
            for c in competitors:
                if isinstance(c, dict):
                    c["price_inr"] = _parse_number(c.get("price_inr"))
                    c["rating"] = _parse_number(c.get("rating"))
                    c["review_count"] = _parse_number(c.get("review_count"))
                    clean_competitors.append(_sanitize(c, _COMPETITOR_COLUMNS))
            
            result = _insert_records("competitors", clean_competitors, run_id)
            logger.info("Competitors stored", **result)
            return json.dumps({**result, "run_id": run_id})
        except Exception as e:
            logger.error("SupabaseCompetitorStoreTool error", error=str(e))
            return json.dumps({"error": str(e), "stored": 0})


# ── Tool 5: Trend Storage ─────────────────────────────────────────────────────

class SupabaseTrendStoreTool(BaseTool):
    """Store trend data — used by Agent 4."""

    name: str = "Supabase Trend Storage"
    description: str = (
        "Stores trend data to the Supabase 'trends' table. "
        "Input: trends_json (JSON list of trend dicts), run_id (string UUID)."
    )

    def _run(self, trends_json: str, run_id: str) -> str:
        try:
            data = _parse_json(trends_json)
            trends = data.get("trends", data) if isinstance(data, dict) else data
            if not isinstance(trends, list):
                trends = [trends]
            
            clean_trends = [_sanitize(t, _TREND_COLUMNS) for t in trends if isinstance(t, dict)]
            result = _insert_records("trends", clean_trends, run_id)
            logger.info("Trends stored", **result)
            return json.dumps({**result, "run_id": run_id})
        except Exception as e:
            logger.error("SupabaseTrendStoreTool error", error=str(e))
            return json.dumps({"error": str(e), "stored": 0})


# ── Tool 6: Concept Storage ───────────────────────────────────────────────────

class SupabaseConceptStoreTool(BaseTool):
    """Store product concepts — used by Agent 6."""

    name: str = "Supabase Product Concept Storage"
    description: str = (
        "Stores product concepts to the Supabase 'product_concepts' table. "
        "Input: concepts_json (JSON list of concept dicts), run_id (string UUID)."
    )

    def _run(self, concepts_json: str, run_id: str) -> str:
        try:
            data = _parse_json(concepts_json)
            concepts = data.get("concepts", data) if isinstance(data, dict) else data
            if not isinstance(concepts, list):
                concepts = [concepts]
            
            clean_concepts = [_sanitize(c, _CONCEPT_COLUMNS) for c in concepts if isinstance(c, dict)]
            result = _insert_records("product_concepts", clean_concepts, run_id)
            logger.info("Product concepts stored", **result)
            return json.dumps({**result, "run_id": run_id})
        except Exception as e:
            logger.error("SupabaseConceptStoreTool error", error=str(e))
            return json.dumps({"error": str(e), "stored": 0})

# ── Tool 6.5: Insight Storage (Missing previously) ────────────────────────────

class SupabaseInsightStoreTool(BaseTool):
    """Store executive insights — used by Agent 5."""

    name: str = "Supabase Insight Storage"
    description: str = (
        "Stores executive insights to the Supabase 'insights' table. "
        "Input: insights_json (JSON list of insight dicts), run_id (string UUID)."
    )

    def _run(self, insights_json: str, run_id: str) -> str:
        try:
            data = _parse_json(insights_json)
            insights = data.get("insights", data) if isinstance(data, dict) else data
            if not isinstance(insights, list):
                insights = [insights]
            
            clean_insights = [_sanitize(i, _INSIGHT_COLUMNS) for i in insights if isinstance(i, dict)]
            result = _insert_records("insights", clean_insights, run_id)
            logger.info("Insights stored", **result)
            return json.dumps({**result, "run_id": run_id})
        except Exception as e:
            logger.error("SupabaseInsightStoreTool error", error=str(e))
            return json.dumps({"error": str(e), "stored": 0})


# ── Tool 7: GTM Storage ───────────────────────────────────────────────────────

class SupabaseGTMStoreTool(BaseTool):
    """Store GTM plan — used by Agent 7."""

    name: str = "Supabase GTM Plan Storage"
    description: str = (
        "Stores GTM plan data to the Supabase 'gtm_plans' table. "
        "Input: gtm_json (GTM plan dict or JSON string), run_id (string UUID), "
        "concept_id (string UUID, optional)."
    )

    def _run(self, gtm_json: str, run_id: str, concept_id: str = None) -> str:
        try:
            db = get_supabase()
            data = json.loads(gtm_json) if isinstance(gtm_json, str) else gtm_json
            if isinstance(data, list):
                data = data[0]
            if not isinstance(data, dict):
                return json.dumps({"error": "gtm_json must be a dict or JSON object", "stored": 0})
            data["run_id"] = run_id
            if concept_id:
                data["concept_id"] = concept_id
            result = db.table("gtm_plans").insert(data).execute()
            stored = len(result.data) if result.data else 0
            logger.info("GTM plan stored", run_id=run_id, stored=stored)
            return json.dumps({"stored": stored, "run_id": run_id})
        except Exception as e:
            logger.error("SupabaseGTMStoreTool error", error=str(e))
            return json.dumps({"error": str(e), "stored": 0})


# ── Tool 8: Sentiment Score Storage ──────────────────────────────────────────

class SupabaseSentimentStoreTool(BaseTool):
    """Store brand sentiment score — triggers Supabase Realtime update."""

    name: str = "Supabase Sentiment Score Storage"
    description: str = (
        "Stores a brand sentiment score to Supabase 'sentiment_scores' table. "
        "Triggers Realtime update to all connected dashboards. "
        "Input: brand_name (str), user_id (str), score (float -1 to 1), "
        "positive_pct (float), negative_pct (float), neutral_pct (float), "
        "post_count (int), platform (str, default 'multi-platform')."
    )

    def _run(
        self,
        brand_name: str,
        user_id: str,
        score: float,
        positive_pct: float = 0.0,
        negative_pct: float = 0.0,
        neutral_pct: float = 0.0,
        post_count: int = 0,
        platform: str = "multi-platform",
    ) -> str:
        try:
            db = get_supabase()
            result = db.table("sentiment_scores").insert({
                "user_id": user_id,
                "brand_name": brand_name,
                "platform": platform,
                "score": round(float(score), 4),
                "positive_pct": round(float(positive_pct), 2),
                "negative_pct": round(float(negative_pct), 2),
                "neutral_pct": round(float(neutral_pct), 2),
                "post_count": int(post_count),
                "alert_sent": False,
            }).execute()
            record_id = result.data[0]["id"] if result.data else None
            logger.info("Sentiment score stored", brand=brand_name, score=score, id=record_id)
            return json.dumps({
                "stored": True,
                "brand": brand_name,
                "score": score,
                "id": record_id,
            })
        except Exception as e:
            logger.error("SupabaseSentimentStoreTool error", error=str(e))
            return json.dumps({"error": str(e), "stored": False})


# ── Tool 9: Price History Storage ─────────────────────────────────────────────

class SupabasePriceStoreTool(BaseTool):
    """Store price history snapshots — used by scheduled price monitor."""

    name: str = "Supabase Price History Storage"
    description: str = (
        "Stores price data points to the 'price_history' table for trend analysis. "
        "Input: price_records_json (JSON list of dicts with brand, platform, price_inr, "
        "rating, review_count), run_id (string UUID)."
    )

    def _run(self, price_records_json: str, run_id: str) -> str:
        try:
            data = json.loads(price_records_json) if isinstance(price_records_json, str) else price_records_json
            records = data if isinstance(data, list) else data.get("records", [])
            result = _insert_records("price_history", records, run_id)
            logger.info("Price history stored", **result)
            return json.dumps({**result, "run_id": run_id})
        except Exception as e:
            logger.error("SupabasePriceStoreTool error", error=str(e))
            return json.dumps({"error": str(e), "stored": 0})


# ── Tool 10: Supplier Storage ─────────────────────────────────────────────────

class SupabaseSupplierStoreTool(BaseTool):
    """Store supplier records — used by Agent 11."""

    name: str = "Supabase Supplier Storage"
    description: str = (
        "Stores supplier/manufacturer records to the 'suppliers' table. "
        "Input: suppliers_json (JSON list of supplier dicts), run_id (string UUID)."
    )

    def _run(self, suppliers_json: str, run_id: str, concept_id: str = "") -> str:
        try:
            data = _parse_json(suppliers_json)
            suppliers = data.get("suppliers", data) if isinstance(data, dict) else data
            if not isinstance(suppliers, list):
                suppliers = [suppliers]
            result = _insert_records("suppliers", suppliers, run_id)
            logger.info("Suppliers stored", **result)
            return json.dumps({**result, "run_id": run_id})
        except Exception as e:
            logger.error("SupabaseSupplierStoreTool error", error=str(e))
            return json.dumps({"error": str(e), "stored": 0})


# ── Tool 11: Compliance Storage ───────────────────────────────────────────────

class SupabaseComplianceStoreTool(BaseTool):
    """Store compliance check results — used by Agent 12."""

    name: str = "Supabase Compliance Check Storage"
    description: str = (
        "Stores compliance check results to the 'compliance_checks' table. "
        "Input: compliance_json (dict with overall_status, checklist, risk_flags, recommendations), "
        "run_id (string UUID), concept_id (string UUID, optional), "
        "regulation_body (str, default 'FSSAI')."
    )

    def _run(
        self,
        compliance_json: str,
        run_id: str,
        concept_id: str = None,
        regulation_body: str = "FSSAI",
    ) -> str:
        try:
            db = get_supabase()
            data = json.loads(compliance_json) if isinstance(compliance_json, str) else compliance_json
            if isinstance(data, list):
                data = data[0]
            if not isinstance(data, dict):
                return json.dumps({"error": "compliance_json must be a dict", "stored": False})
            data["run_id"] = run_id
            data["regulation_body"] = regulation_body
            if concept_id:
                data["concept_id"] = concept_id
            db.table("compliance_checks").insert(data).execute()
            logger.info("Compliance check stored", run_id=run_id, body=regulation_body)
            return json.dumps({"stored": True, "run_id": run_id, "regulation_body": regulation_body})
        except Exception as e:
            logger.error("SupabaseComplianceStoreTool error", error=str(e))
            return json.dumps({"error": str(e), "stored": False})


# ── Tool 12: Generic Data Fetcher ─────────────────────────────────────────────

class SupabaseDataFetchTool(BaseTool):
    """Fetch any table rows for a run_id — used by Agents 5–8."""

    name: str = "Supabase Data Fetcher"
    description: str = (
        "Fetches all rows for a given run_id from any Supabase table. "
        "Input: table (table name string), run_id (string UUID). "
        "Optional: limit (int, default 500)."
    )

    def _run(self, table: str, run_id: str, limit: int = 500) -> str:
        try:
            db = get_supabase()
            result = (
                db.table(table)
                .select("*")
                .eq("run_id", run_id)
                .limit(limit)
                .execute()
            )
            data = result.data or []
            logger.info("Data fetched", table=table, run_id=run_id, count=len(data))
            return json.dumps({
                "table": table,
                "count": len(data),
                "data": data,
                "run_id": run_id,
            })
        except Exception as e:
            logger.error("SupabaseDataFetchTool error", table=table, run_id=run_id, error=str(e))
            return json.dumps({"error": str(e), "table": table, "run_id": run_id, "data": []})


# ── Tool 13: Slack Alert ──────────────────────────────────────────────────────

class SlackAlertTool(BaseTool):
    """Send Slack alert — used by sentiment monitor when score drops critically."""

    name: str = "Slack Alert Sender"
    description: str = (
        "Sends a Slack alert message when brand sentiment drops critically. "
        "Input: message (alert text string)."
    )

    def _run(self, message: str) -> str:
        webhook_url = settings.SLACK_WEBHOOK_URL
        if not webhook_url:
            return json.dumps({"sent": False, "reason": "SLACK_WEBHOOK_URL not configured"})
        try:
            resp = httpx.post(
                webhook_url,
                json={
                    "text": message,
                    "username": "ProductIQ Alert Bot",
                    "icon_emoji": ":warning:",
                },
                timeout=10,
            )
            sent = resp.status_code == 200
            logger.info("Slack alert sent", sent=sent, status=resp.status_code)
            return json.dumps({"sent": sent, "status_code": resp.status_code})
        except Exception as e:
            logger.error("SlackAlertTool error", error=str(e))
            return json.dumps({"error": str(e), "sent": False})