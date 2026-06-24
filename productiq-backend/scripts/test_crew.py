"""
ProductIQ — Full Pipeline Test Script
Run from productiq-backend/ directory: venv\Scripts\python.exe scripts\test_crew.py

This does a REAL execution — connects to Supabase, calls Gemini, runs all 8 agents.
Estimated time: 15–30 minutes for a full run.

Flags:
  --category  Product category (default: "protein powder")
  --brand     Brand name (default: "MuscleBlaze")
  --quick     Run only Agent 1 (scraper) for rapid testing — no BERTopic, no LLM agents 2-8
"""

import sys
import os
import traceback

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Disable CrewAI and OpenTelemetry to prevent Windows exit crashes / hangs
os.environ["CREWAI_DISABLE_TELEMETRY"] = "true"
os.environ["OTEL_SDK_DISABLED"] = "true"

# Force UTF-8 for CrewAI emojis
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import uuid
from datetime import datetime


def run_test(category: str = "SunScreen", brand: str = "Minimalist", quick: bool = False):
    from database import get_supabase
    db = get_supabase()

    run_id = str(uuid.uuid4())
    user_id = "b1755b92-52ac-423d-ade9-87dbc628be96"

    # Initialize run record in DB to satisfy foreign keys for agent_outputs
    db.table("agent_runs").insert({
        "id": run_id,
        "user_id": user_id,
        "product_category": category,
        "brand_name": brand,
        "status": "queued",
        "progress_pct": 0
    }).execute()

    sep = "=" * 65
    print(f"\n{sep}")
    print("  ProductIQ — Full Pipeline Integration Test")
    print(sep)
    print(f"  Category  : {category}")
    print(f"  Brand     : {brand}")
    print(f"  Run ID    : {run_id}")
    print(f"  Mode      : {'QUICK (Agent 1 only)' if quick else 'FULL (8 agents)'}")
    print(f"  Started   : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{sep}\n")

    if quick:
        # Quick mode: only run the scraper tool directly (no crew overhead)
        print("  [QUICK MODE] Running scraper tools directly (bypasses CrewAI)...\n")
        from tools.scraping_tools import AmazonScraperTool, FlipkartScraperTool
        from tools.storage_tools import SupabaseStoreTool

        amazon = AmazonScraperTool()
        flipkart = FlipkartScraperTool()
        store = SupabaseStoreTool()

        print("  [1/3] Calling Amazon scraper...")
        amazon_result = amazon._run(query=category, max_results=10)
        import json
        amazon_data = json.loads(amazon_result)
        print(f"        Amazon: {amazon_data.get('total', 0)} products")

        print("  [2/3] Calling Flipkart scraper...")
        fk_result = flipkart._run(query=category, max_results=10)
        fk_data = json.loads(fk_result)
        print(f"        Flipkart: {fk_data.get('total', 0)} products")

        print("  [3/3] Storing to Supabase...")
        all_products = amazon_data.get("products", []) + fk_data.get("products", [])
        store_result = store._run(products_json=json.dumps({"products": all_products}), run_id=run_id)
        store_data = json.loads(store_result)
        print(f"        Stored: {store_data.get('stored', 0)} products")

        print(f"\n{sep}")
        print("  [SUCCESS] Quick test COMPLETE!")
        print(f"  Run ID : {run_id}")
        print(f"  Ended  : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{sep}\n")
        return

    from crews.main_crew import run_main_crew

    def on_progress(agent_name: str, agent_num: int, status: str):
        icon = "[RUNNING]" if status == "running" else "[DONE]" if status == "completed" else "[FAILED]"
        print(f"  {icon}  Agent {agent_num}: {agent_name} -> {status.upper()}")

    try:
        result = run_main_crew(
            product_category=category,
            brand_name=brand,
            run_id=run_id,
            user_id=user_id,
            is_watermarked=True,
            progress_callback=on_progress,
        )

        print(f"\n{sep}")
        print("  [SUCCESS] Pipeline COMPLETE!")
        print(f"  Status : {result.get('status')}")
        print(f"  Ended  : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{sep}\n")

    except Exception as e:
        print(f"\n{sep}")
        print(f"  [ERROR] Pipeline FAILED: {e}")
        print(f"\n  Full traceback:")
        traceback.print_exc()
        print(f"{sep}\n")
        raise


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="ProductIQ Full Pipeline Test")
    parser.add_argument("--category", default="Face Serum", help="Product category to analyse")
    parser.add_argument("--brand", default="Minimalist", help="Brand name to focus on")
    parser.add_argument("--quick", action="store_true",
                        help="Quick mode: only run scraper tools directly (no full crew)")
    args = parser.parse_args()

    run_test(category=args.category, brand=args.brand, quick=args.quick)