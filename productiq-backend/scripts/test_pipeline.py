"""
ProductIQ - Backend Validation Script
scripts/test_pipeline.py

Runs isolated tests to validate each component before running the full pipeline.
Execute from the productiq-backend directory:

    python scripts/test_pipeline.py
    python scripts/test_pipeline.py --full --query "face serum"

Tests:
  1. Config loading
  2. Supabase connectivity
  3. Apify token validation
  4. Amazon scraper  (real Apify call)
  5. Flipkart scraper (real Apify call)
  6. Review scraper  (real Apify call)
  7. SSE manager     (in-process queue)
  8. Full pipeline smoke test (optional -- pass --full to enable)
"""

import sys
import os
import json
import asyncio
import argparse
from pathlib import Path

# Disable CrewAI and OpenTelemetry to prevent Windows exit crashes / hangs
os.environ["CREWAI_DISABLE_TELEMETRY"] = "true"
os.environ["OTEL_SDK_DISABLED"] = "true"

# Allow imports from the backend root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

SEP = "-" * 60


def _ok(msg):   print("  [PASS]  " + msg)
def _fail(msg): print("  [FAIL]  " + msg)
def _warn(msg): print("  [WARN]  " + msg)
def _header(msg): print("\n" + SEP + "\n  " + msg + "\n" + SEP)


# ── Test 1: Config ────────────────────────────────────────────────

def test_config():
    _header("1. Config Loading")
    from config import settings
    summary = settings.log_configuration_summary()
    for key, val in summary.items():
        if val:
            _ok(f"{key} = {val}")
        else:
            _warn(f"{key} = {val} (not configured)")
    if not settings.apify_configured:
        _fail("APIFY_API_TOKEN is empty or placeholder -- scraping WILL fail")
        return False
    _ok("APIFY_API_TOKEN looks real")
    return True


# ── Test 2: Supabase ──────────────────────────────────────────────

def test_supabase():
    _header("2. Supabase Connectivity")
    try:
        from database import get_supabase
        db = get_supabase()
        result = db.table("agent_runs").select("id", count="exact").limit(1).execute()
        count = result.count if hasattr(result, "count") else "?"
        _ok(f"Connected. agent_runs rows: {count}")
        return True
    except Exception as e:
        _fail(f"Supabase connection failed: {e}")
        return False


# ── Test 3: Apify Token ───────────────────────────────────────────

def test_apify_token():
    _header("3. Apify Token Validation")
    from config import settings
    if not settings.apify_configured:
        _warn("Skipping -- APIFY_API_TOKEN not configured")
        return False
    try:
        from apify_client import ApifyClient
        client = ApifyClient(settings.APIFY_API_TOKEN)
        me = client.user("me").get()
        username = me.get("username", "unknown") if me else "unknown"
        usage = (me or {}).get("monthlyUsage", {}).get("totalUsd", "?")
        _ok(f"Apify user: {username}, monthly usage: ${usage}")
        return True
    except Exception as e:
        _fail(f"Apify token invalid: {e}")
        return False


# ── Test 4: Amazon Scraper ────────────────────────────────────────

def test_amazon_scraper(query="whey protein", max_results=3):
    _header(f"4. Amazon Scraper -- '{query}' (max {max_results})")
    from config import settings
    if not settings.apify_configured:
        _warn("Skipping -- APIFY_API_TOKEN not configured")
        return False
    try:
        from tools.scraping_tools import AmazonScraperTool
        tool = AmazonScraperTool()
        result_json = tool._run(query=query, max_results=max_results)
        data = json.loads(result_json)
        if data.get("error"):
            _fail(f"Error: {data['error']}")
            return False
        total = data.get("total", 0)
        _ok(f"Returned {total} products")
        if total > 0:
            p = data["products"][0]
            name = str(p.get("product_name", "N/A"))[:60]
            price = p.get("price_inr")
            rating = p.get("rating")
            _ok(f"Sample -- {name} | Rs.{price} | Rating:{rating}")
            return True
        else:
            _warn("Zero products returned -- actor may have changed schema. Check Apify console.")
            return False
    except Exception as e:
        _fail(f"Amazon scraper crashed: {e}")
        return False


# ── Test 5: Flipkart Scraper ─────────────────────────────────────

def test_flipkart_scraper(query="whey protein", max_results=3):
    _header(f"5. Flipkart Scraper -- '{query}' (max {max_results})")
    from config import settings
    if not settings.apify_configured:
        _warn("Skipping -- APIFY_API_TOKEN not configured")
        return False
    try:
        from tools.scraping_tools import FlipkartScraperTool
        tool = FlipkartScraperTool()
        result_json = tool._run(query=query, max_results=max_results)
        data = json.loads(result_json)
        if data.get("error"):
            _fail(f"Error: {data['error']}")
            return False
        total = data.get("total", 0)
        _ok(f"Returned {total} products")
        if total > 0:
            p = data["products"][0]
            name = str(p.get("product_name", "N/A"))[:60]
            price = p.get("price_inr")
            _ok(f"Sample -- {name} | Rs.{price}")
            return True
        else:
            _warn("Zero products -- primary actor failed. Fallback may also have failed.")
            return False
    except Exception as e:
        _fail(f"Flipkart scraper crashed: {e}")
        return False


# ── Test 6: Review Scraper ────────────────────────────────────────

def test_review_scraper(
    product_url="https://www.amazon.in/dp/B07WQXF9Y8",
    max_reviews=5,
):
    _header(f"6. Review Scraper -- {product_url}")
    from config import settings
    if not settings.apify_configured:
        _warn("Skipping -- APIFY_API_TOKEN not configured")
        return False
    try:
        from tools.scraping_tools import ReviewScraperTool
        tool = ReviewScraperTool()
        result_json = tool._run(product_url=product_url, max_reviews=max_reviews)
        data = json.loads(result_json)
        if data.get("error"):
            _fail(f"Error: {data['error']}")
            return False
        total = data.get("total", 0)
        asin = data.get("asin", "?")
        _ok(f"ASIN extracted: {asin} | Reviews returned: {total}")
        if total > 0:
            r = data["reviews"][0]
            body_preview = str(r.get("body", ""))[:80]
            _ok(f"Sample -- Rating:{r.get('rating')} | {body_preview}...")
            return True
        else:
            _warn("Zero reviews returned -- ASIN may have no reviews or actor schema changed.")
            return False
    except Exception as e:
        _fail(f"Review scraper crashed: {e}")
        return False


# ── Test 7: SSE Manager ───────────────────────────────────────────

async def _run_sse_test():
    _header("7. SSE Manager (In-Process Queue)")
    try:
        from streaming import sse_manager
        queue = await sse_manager.subscribe("test-run-999")
        await sse_manager.broadcast("test-run-999", json.dumps({"type": "heartbeat"}))
        msg = await asyncio.wait_for(queue.get(), timeout=2.0)
        await sse_manager.unsubscribe("test-run-999", queue)
        parsed = json.loads(msg)
        if parsed.get("type") == "heartbeat":
            _ok("In-process SSE pub/sub works correctly")
            return True
        else:
            _fail(f"Unexpected message: {parsed}")
            return False
    except asyncio.TimeoutError:
        _fail("Timeout waiting for SSE message")
        return False
    except Exception as e:
        _fail(f"SSE manager error: {e}")
        return False


def test_sse_manager():
    return asyncio.run(_run_sse_test())


# ── Test 8: Full Pipeline Execution ─────────────────────────────────

def test_full_pipeline(category="whey protein", brand="MuscleBlaze"):
    _header(f"8. Full Pipeline Execution -- '{category}' / '{brand}'")
    _warn("This will run ALL 8 AGENTS and consume API credits.")
    _warn("Estimated time: 15-30 minutes.")
    
    import uuid
    from datetime import datetime
    
    run_id = str(uuid.uuid4())
    user_id = "b1755b92-52ac-423d-ade9-87dbc628be96"
    _ok(f"Run ID: {run_id}")
    
    try:
        from database import get_supabase
        db = get_supabase()
        
        # Initialize run record in DB to satisfy foreign keys
        db.table("agent_runs").insert({
            "id": run_id,
            "user_id": user_id,
            "product_category": category,
            "brand_name": brand,
            "status": "queued",
            "progress_pct": 0
        }).execute()
        
        from crews.main_crew import run_main_crew
        
        def on_progress(agent_name: str, agent_num: int, status: str):
            icon = "[RUNNING]" if status == "running" else "[DONE]" if status == "completed" else "[FAILED]"
            print(f"      {icon}  Agent {agent_num}: {agent_name} -> {status.upper()}")

        print(f"      Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        result = run_main_crew(
            product_category=category,
            brand_name=brand,
            run_id=run_id,
            user_id=user_id,
            is_watermarked=True,
            progress_callback=on_progress,
        )
        
        _ok("Pipeline COMPLETE!")
        _ok(f"Status: {result.get('status')}")
        print(f"      Ended at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        return True
    except Exception as e:
        _fail(f"Pipeline execution failed: {e}")
        import traceback
        traceback.print_exc()
        return False


# ── Main ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="ProductIQ Backend Tests")
    parser.add_argument("--full", action="store_true", help="Run full pipeline smoke test")
    parser.add_argument("--query", default="whey protein", help="Search query for scraping tests")
    args = parser.parse_args()

    print("\n" + "=" * 60)
    print("   ProductIQ Backend Validation Suite")
    print("=" * 60)

    results = {}
    results["config"]   = test_config()
    results["supabase"] = test_supabase()
    results["apify"]    = test_apify_token()
    results["amazon"]   = test_amazon_scraper(query=args.query)
    results["flipkart"] = test_flipkart_scraper(query=args.query)
    results["reviews"]  = test_review_scraper()
    results["sse"]      = test_sse_manager()

    if args.full:
        results["pipeline"] = test_full_pipeline(category=args.query)

    print("\n" + "=" * 60)
    print("   Results Summary")
    print("=" * 60)
    passed = sum(1 for v in results.values() if v)
    total  = len(results)
    for name, ok in results.items():
        status = "PASS" if ok else "FAIL"
        print(f"   [{status}]  {name}")
    print(f"\n   {passed}/{total} tests passed")

    if passed < total:
        critical = not results.get("amazon") or not results.get("reviews")
        if critical:
            print("\n   CRITICAL: Scraper tests failed -- Agents 1 & 2 will return empty data.")
            print("   Check Apify actor IDs and token in .env\n")
        sys.exit(1)
    else:
        print("\n   All tests passed -- backend is production ready.\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
