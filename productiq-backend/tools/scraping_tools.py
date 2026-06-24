"""
ProductIQ — All Custom CrewAI Scraping Tools
tools/scraping_tools.py

Uses Apify for all e-commerce data extraction.
Direct scraping is blocked by anti-bot systems on Amazon & Flipkart.

Actor IDs and their CORRECT input schemas (verified from Apify Store 2026-05):
  Amazon Products : codingfrontend/amazon-product-scraper
    Input  → { "searchQuery": str, "mode": "search", "maxItems": int }
    Output → items with keys: title, price, rating, reviews, url, asin, images

  Flipkart (primary) : shahidirfan/flipkart-product-scraper
    Input  → { "search": str, "maxItems": int }
    Output → items with keys: title, brand, price, formattedPrice, mrp, formattedMrp,
             averageRating, ratingCount, reviewCount, url, specifications, isAvailable,
             availabilityState, flipkartAssured, discountPercentage

  Flipkart (fallback) : maxcopell/flipkart-scraper
    Input  → { "start_urls": [{"url": "https://www.flipkart.com/search?q={keyword}"}] }
    Output → items with keys: name, price, rating, url, image

  Amazon Reviews  : junglee/amazon-reviews-scraper
    Input  → { "productUrls": [{"url": "https://www.amazon.in/dp/ASINXXXX"}],
               "maxReviews": int, "sort": "helpful" | "recent" }
    Output → flat items per review: body, rating, title, date, verifiedPurchase
"""

import json
import time
import structlog
from typing import Optional
from crewai.tools import BaseTool
from apify_client import ApifyClient
from config import settings

logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ACTOR_TIMEOUT_SECS = 180   # 3 min max per actor — never block Celery for 5+ min
_MAX_RETRIES = 2             # retry once on transient failure


def _get_client() -> ApifyClient:
    if not settings.apify_configured:
        raise RuntimeError(
            "APIFY_API_TOKEN is not configured. "
            "Add a valid token to your .env file."
        )
    return ApifyClient(settings.APIFY_API_TOKEN)


def _call_actor(
    actor_id: str,
    run_input: dict,
    *,
    timeout_secs: int = _ACTOR_TIMEOUT_SECS,
    max_retries: int = _MAX_RETRIES,
) -> list[dict]:
    """
    Call an Apify actor and return all dataset items.
    Retries once on transient failures with exponential back-off.
    Returns [] on failure (never raises) — agents must handle empty results.
    """
    client = _get_client()
    last_error: Optional[Exception] = None

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(
                "Calling Apify actor",
                actor=actor_id,
                attempt=attempt,
                input_keys=list(run_input.keys()),
            )
            run = client.actor(actor_id).call(
                run_input=run_input,
                timeout_secs=timeout_secs,
            )
            if not run:
                raise ValueError("Apify returned empty run object")

            dataset_id = run.get("defaultDatasetId")
            if not dataset_id:
                raise ValueError(f"No dataset ID in run: {run}")

            items = list(client.dataset(dataset_id).iterate_items())
            logger.info(
                "Apify actor completed",
                actor=actor_id,
                items=len(items),
            )
            return items

        except Exception as exc:
            last_error = exc
            wait = 2 ** attempt
            logger.warning(
                "Apify actor call failed",
                actor=actor_id,
                attempt=attempt,
                error=str(exc),
                retry_in=wait if attempt < max_retries else "no_retry",
            )
            if attempt < max_retries:
                time.sleep(wait)

    logger.error(
        "Apify actor exhausted all retries",
        actor=actor_id,
        error=str(last_error),
    )
    return []   # ← graceful empty list, not a raise


# ---------------------------------------------------------------------------
# Tool 1 — Amazon India Product Scraper
# ---------------------------------------------------------------------------

class AmazonScraperTool(BaseTool):
    name: str = "Amazon India Product Scraper"
    description: str = (
        "Scrapes product listings from Amazon India for a given search query using Apify. "
        "Returns structured product data: name, price, MRP, rating, review count, URL, images. "
        "Input: query (string, e.g. 'protein powder'). "
        "Optional: max_results (int, default 50)."
    )

    def _run(self, query: str, max_results: int = 50) -> str:
        if not settings.apify_configured:
            return json.dumps({
                "error": "APIFY_API_TOKEN not configured",
                "products": [],
                "total": 0,
                "platform": "amazon_india",
            })

        actor_id = settings.APIFY_AMAZON_ACTOR_ID
        # Verified schema for codingfrontend/amazon-product-scraper
        run_input = {
            "searchQuery": query,      # correct field name for this actor
            "mode": "search",          # required: use search mode not direct URL
            "maxItems": max_results,
        }

        items = _call_actor(actor_id, run_input, timeout_secs=_ACTOR_TIMEOUT_SECS)
        products = []
        for item in items:
            try:
                # bebity actor output keys: title, price, stars, ratingsTotal, url, asin, images, brand
                name = (
                    item.get("title")
                    or item.get("name")
                    or item.get("productName")
                    or item.get("product_name")
                )
                if not name:
                    continue

                price_raw = (
                    item.get("price")
                    or item.get("currentPrice")
                    or item.get("price_inr")
                )
                if isinstance(price_raw, str):
                    try:
                        price_raw = float(
                            price_raw.replace("₹", "").replace(",", "").strip()
                        )
                    except ValueError:
                        price_raw = None
                elif isinstance(price_raw, (int, float)):
                    price_raw = float(price_raw)

                rating_raw = item.get("stars") or item.get("rating")
                try:
                    rating = float(str(rating_raw).split(" ")[0]) if rating_raw else None
                except (ValueError, AttributeError):
                    rating = None

                review_count_raw = (
                    item.get("ratingsTotal")
                    or item.get("reviewsCount")
                    or item.get("review_count")
                )
                try:
                    review_count = int(review_count_raw) if review_count_raw else None
                except (ValueError, TypeError):
                    review_count = None

                # images can be a list of dicts or a list of strings
                images_raw = item.get("images") or []
                if isinstance(images_raw, list) and images_raw:
                    if isinstance(images_raw[0], dict):
                        images = [img.get("url") or img.get("src") for img in images_raw if isinstance(img, dict)]
                    else:
                        images = [str(i) for i in images_raw]
                elif item.get("image"):
                    images = [item["image"]]
                else:
                    images = []

                products.append({
                    "platform": "amazon_india",
                    "product_name": str(name)[:500],
                    "brand": str(item.get("brand") or item.get("brand_name") or "")[:200] or None,
                    "price_inr": price_raw,
                    "mrp_inr": item.get("originalPrice") or item.get("mrp"),
                    "rating": rating,
                    "review_count": review_count,
                    "url": item.get("url") or item.get("productUrl"),
                    "asin": item.get("asin"),
                    "images": [i for i in images if i],
                    "specs": item.get("specifications") or item.get("specs"),
                })
            except Exception as parse_err:
                logger.debug("Amazon item parse error", error=str(parse_err))
                continue

        products = products[:max_results]
        logger.info("Amazon scrape complete", query=query, total=len(products))
        return json.dumps({
            "products": products,
            "total": len(products),
            "platform": "amazon_india",
            "query": query,
        })


# ---------------------------------------------------------------------------
# Tool 2 — Flipkart Product Scraper (with fallback actor)
# ---------------------------------------------------------------------------

class FlipkartScraperTool(BaseTool):
    name: str = "Flipkart Product Scraper"
    description: str = (
        "Scrapes product listings from Flipkart for a given search query using Apify. "
        "Automatically falls back to a secondary actor if the primary is unavailable. "
        "Input: query (string). Optional: max_results (int, default 50)."
    )

    def _run(self, query: str, max_results: int = 50) -> str:
        if not settings.apify_configured:
            return json.dumps({
                "error": "APIFY_API_TOKEN not configured",
                "products": [],
                "total": 0,
                "platform": "flipkart",
            })

        import urllib.parse
        search_url = f"https://www.flipkart.com/search?q={urllib.parse.quote(query)}"

        # ── Try primary actor: shahidirfan/flipkart-product-scraper ─────────────
        # Input schema: { "startUrls": [{"url": ...}], "maxItems": int }
        # The actor requires a Flipkart listing/search URL, not a keyword
        primary_actor = settings.APIFY_FLIPKART_ACTOR_ID
        primary_input = {
            "startUrls": [{"url": search_url}],  # Flipkart search URL
            "maxItems": max_results,
        }
        items = _call_actor(primary_actor, primary_input, timeout_secs=_ACTOR_TIMEOUT_SECS)

        # ── Fallback: maxcopell/flipkart-scraper (also uses start_urls) ───────────────
        if not items:
            fallback_actor = settings.APIFY_FLIPKART_ACTOR_ID_FALLBACK
            logger.info("Flipkart primary actor returned 0 items — trying fallback", fallback=fallback_actor)
            fallback_input = {
                "start_urls": [{"url": search_url}],
            }
            items = _call_actor(fallback_actor, fallback_input, timeout_secs=_ACTOR_TIMEOUT_SECS)

        def _parse_price(item: dict) -> float | None:
            """Extract numeric price from shahidirfan or fallback actor output."""
            # shahidirfan actor: price is usually numeric, formattedPrice is "₹1,299"
            raw = (
                item.get("price")
                or item.get("currentPrice")
                or item.get("current_price")
                or item.get("salePrice")
            )
            if raw is None:
                # Try formatted string fallback
                formatted = item.get("formattedPrice") or item.get("formatted_price") or ""
                if formatted:
                    raw = formatted
            if isinstance(raw, (int, float)):
                return float(raw)
            if isinstance(raw, str):
                try:
                    return float(raw.replace("₹", "").replace(",", "").strip())
                except ValueError:
                    pass
            return None

        def _parse_mrp(item: dict) -> float | None:
            raw = (
                item.get("mrp")
                or item.get("originalPrice")
                or item.get("original_price")
            )
            if raw is None:
                formatted = item.get("formattedMrp") or item.get("formatted_mrp") or ""
                if formatted:
                    raw = formatted
            if isinstance(raw, (int, float)):
                return float(raw)
            if isinstance(raw, str):
                try:
                    return float(raw.replace("₹", "").replace(",", "").strip())
                except ValueError:
                    pass
            return None

        def _parse_rating(item: dict) -> float | None:
            # shahidirfan: averageRating (float), fallback: rating or stars
            raw = (
                item.get("averageRating")
                or item.get("rating")
                or item.get("stars")
            )
            try:
                return float(str(raw).split("/")[0]) if raw is not None else None
            except (ValueError, AttributeError):
                return None

        def _parse_review_count(item: dict) -> int | None:
            # shahidirfan: reviewCount and ratingCount are both present
            raw = (
                item.get("reviewCount")
                or item.get("ratingCount")
                or item.get("reviewsCount")
                or item.get("review_count")
            )
            try:
                return int(raw) if raw is not None else None
            except (ValueError, TypeError):
                return None

        products = []
        for item in items:
            try:
                # Name: shahidirfan uses "title"; fallback uses "name"/"productName"
                name = (
                    item.get("title")
                    or item.get("name")
                    or item.get("productName")
                    or item.get("product_name")
                )
                if not name:
                    continue

                # Images: shahidirfan may return image list or single image
                images_raw = item.get("images") or []
                if isinstance(images_raw, list) and images_raw:
                    images = [str(i) for i in images_raw if i]
                elif item.get("image"):
                    images = [str(item["image"])]
                else:
                    images = []

                # in_stock: shahidirfan returns isAvailable (bool) or availabilityState (str)
                is_available = item.get("isAvailable")
                if is_available is None:
                    avail_state = str(item.get("availabilityState") or "").lower()
                    is_available = "out" not in avail_state if avail_state else None

                products.append({
                    "platform": "flipkart",
                    "product_name": str(name)[:500],
                    "brand": str(item.get("brand") or item.get("brand_name") or "")[:200] or None,
                    "price_inr": _parse_price(item),
                    "mrp_inr": _parse_mrp(item),
                    "rating": _parse_rating(item),
                    "review_count": _parse_review_count(item),
                    "url": item.get("url") or item.get("productUrl") or item.get("product_url"),
                    "images": images,
                    "in_stock": is_available,
                    # shahidirfan provides structured specs; keep as-is for JSON storage
                    "specs": item.get("specifications") or item.get("specs"),
                })
            except Exception as parse_err:
                logger.debug("Flipkart item parse error", error=str(parse_err))
                continue

        products = products[:max_results]
        logger.info("Flipkart scrape complete", query=query, total=len(products))
        return json.dumps({
            "products": products,
            "total": len(products),
            "platform": "flipkart",

            "query": query,
        })


# ---------------------------------------------------------------------------
# Tool 3 — Amazon Review Scraper
# ---------------------------------------------------------------------------

class ReviewScraperTool(BaseTool):
    name: str = "Amazon Review Scraper"
    description: str = (
        "Scrapes customer reviews for an Amazon India product using Apify. "
        "Input: product_url (full Amazon India product page URL, "
        "e.g. https://www.amazon.in/dp/B07XXXXX OR https://www.amazon.in/gp/product/B07XXXXX). "
        "Optional: max_reviews (int, default 100)."
    )

    def _run(self, product_url: str, max_reviews: int = 100) -> str:
        if not settings.apify_configured:
            return json.dumps({
                "error": "APIFY_API_TOKEN not configured",
                "reviews": [],
                "total": 0,
            })

        # ── Extract ASIN from URL ─────────────────────────────────────────────
        asin: Optional[str] = None
        for pattern in ["/dp/", "/gp/product/", "/product-reviews/"]:
            if pattern in product_url:
                asin = product_url.split(pattern)[1].split("/")[0].split("?")[0]
                break

        # Validate ASIN (must be exactly 10 alphanumeric chars)
        if not asin or len(asin) != 10 or not asin.isalnum():
            logger.warning("Cannot extract valid ASIN from URL", url=product_url)
            return json.dumps({
                "error": f"Cannot extract ASIN from URL: {product_url}",
                "reviews": [],
                "total": 0,
            })

        actor_id = settings.APIFY_REVIEWS_ACTOR_ID

        # Verified schema for junglee/amazon-reviews-scraper:
        # uses "productUrls" (list of {url} objects pointing to the product page)
        # NOT "startUrls" or "asins"
        run_input = {
            "productUrls": [{"url": product_url}],  # product page URL (not review URL)
            "maxReviews": max_reviews,
            "sort": "recent",            # "recent" | "helpful"
        }

        items = _call_actor(actor_id, run_input, timeout_secs=_ACTOR_TIMEOUT_SECS)
        all_reviews = []

        for item in items:
            try:
                # junglee actor returns ONE item per review (flat structure)
                body = (
                    item.get("body")
                    or item.get("reviewText")
                    or item.get("text")
                    or item.get("review_text")
                    or ""
                )
                if len(str(body).strip()) < 10:
                    continue

                rating_raw = item.get("rating") or item.get("stars")
                try:
                    # "4.0 out of 5 stars" → 4.0
                    rating = float(str(rating_raw).split(" ")[0]) if rating_raw else None
                except (ValueError, AttributeError):
                    rating = None

                all_reviews.append({
                    "platform": "amazon_india",
                    "asin": asin,
                    "rating": rating,
                    "title": str(item.get("title") or item.get("reviewTitle") or "")[:500],
                    "body": str(body)[:5000],
                    "reviewed_at": item.get("date") or item.get("reviewDate") or item.get("reviewed_at"),
                    "verified_purchase": bool(
                        item.get("verifiedPurchase") or item.get("verified_purchase")
                    ),
                    "helpful_votes": int(item.get("helpfulVotes") or item.get("helpful_votes") or 0),
                })
            except Exception as parse_err:
                logger.debug("Review item parse error", error=str(parse_err))
                continue

        all_reviews = all_reviews[:max_reviews]
        logger.info("Review scrape complete", asin=asin, total=len(all_reviews))
        return json.dumps({
            "reviews": all_reviews,
            "total": len(all_reviews),
            "asin": asin,
            "product_url": product_url,
        })


# ---------------------------------------------------------------------------
# Tool 4 — Apify Web Browser (JavaScript-heavy pages)
# ---------------------------------------------------------------------------

class ApifyWebBrowserTool(BaseTool):
    name: str = "Apify Web Browser"
    description: str = (
        "Renders a URL through Apify's browser-based scraper and returns the page text. "
        "Use for D2C brand sites, JavaScript-heavy pages that block direct scraping. "
        "Input: url (full URL to visit)."
    )

    def _run(self, url: str) -> str:
        if not settings.apify_configured:
            return json.dumps({
                "error": "APIFY_API_TOKEN not configured",
                "url": url,
                "text": "",
                "success": False,
            })

        actor_id = settings.APIFY_WEB_BROWSER_ACTOR_ID  # apify/web-scraper (always available)
        run_input = {
            "startUrls": [{"url": url}],
            "pageFunction": """
                async function pageFunction(context) {
                    const { page, request } = context;
                    await page.waitForTimeout(2000);
                    const text = await page.evaluate(() => document.body.innerText);
                    return { url: request.url, text: text.slice(0, 10000) };
                }
            """,
            "maxRequestsPerCrawl": 1,
        }

        items = _call_actor(actor_id, run_input, timeout_secs=120, max_retries=1)
        if items:
            item = items[0]
            return json.dumps({
                "url": url,
                "text": str(item.get("text", ""))[:10000],
                "success": True,
            })
        return json.dumps({
            "url": url,
            "text": "",
            "success": False,
            "error": "No content returned from Apify browser",
        })