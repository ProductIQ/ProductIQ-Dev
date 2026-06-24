"""
ProductIQ — Search & Discovery Tools
SerpAPI, Google Trends, Reddit, IndiaMart
"""

import json
from crewai.tools import BaseTool
from config import settings
import structlog

logger = structlog.get_logger()


class SerpAPITool(BaseTool):
    name: str = "Google Search via SerpAPI"
    description: str = (
        "Searches Google and returns top organic results with title, link, and snippet. "
        "Best for competitor research, news search, and finding brand information. "
        "Input: query string. Optional num_results (default 10)."
    )

    def _run(self, query: str, num_results: int = 10) -> str:
        if not settings.SERPAPI_KEY:
            # Fallback: basic httpx search simulation for development
            return json.dumps({
                "warning": "SERPAPI_KEY not set — using mock data for development",
                "results": [
                    {
                        "title": f"Search result for: {query}",
                        "link": f"https://example.com/result-1",
                        "snippet": f"This is a placeholder result for '{query}'. Set SERPAPI_KEY for real data.",
                    }
                ],
                "query": query,
            })

        try:
            from serpapi import GoogleSearch
            search = GoogleSearch({
                "q": query,
                "location": "India",
                "hl": "en",
                "gl": "in",
                "api_key": settings.SERPAPI_KEY,
                "num": min(num_results, 20),
            })
            results = search.get_dict()
            organic = results.get("organic_results", [])
            output = [
                {
                    "title": r.get("title"),
                    "link": r.get("link"),
                    "snippet": r.get("snippet"),
                    "date": r.get("date"),
                }
                for r in organic
            ]
            return json.dumps({"results": output, "total": len(output), "query": query})
        except Exception as e:
            logger.error("SerpAPI error", query=query, error=str(e))
            return json.dumps({"error": str(e), "results": [], "query": query})


class GoogleSearchTool(BaseTool):
    name: str = "Google Search (Direct)"
    description: str = (
        "Direct HTTP search using Google. Use when SerpAPI is unavailable. "
        "Input: query string."
    )

    def _run(self, query: str) -> str:
        import httpx
        from bs4 import BeautifulSoup
        from fake_useragent import UserAgent

        ua = UserAgent()
        headers = {
            "User-Agent": ua.random,
            "Accept-Language": "en-IN,en;q=0.9",
        }
        url = f"https://www.google.com/search?q={query.replace(' ', '+')}&hl=en&gl=IN"

        try:
            resp = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
            soup = BeautifulSoup(resp.text, "html.parser")

            results = []
            for g in soup.select("div.tF2Cxc")[:10]:
                title_el = g.select_one("h3")
                link_el = g.select_one("a")
                snippet_el = g.select_one("div.VwiC3b, span.aCOpRe")

                results.append({
                    "title": title_el.get_text(strip=True) if title_el else "",
                    "link": link_el["href"] if link_el else "",
                    "snippet": snippet_el.get_text(strip=True) if snippet_el else "",
                })

            return json.dumps({"results": results, "total": len(results), "query": query})
        except Exception as e:
            return json.dumps({"error": str(e), "results": [], "query": query})


class GoogleTrendsTool(BaseTool):
    name: str = "Google Trends Analyser"
    description: str = (
        "Fetches Google Trends data for keywords in India. Returns interest over time and "
        "rising related queries. Input: keywords (comma-separated, max 5). "
        "Optional timeframe (default 'today 12-m')."
    )

    def _run(self, keywords: str, timeframe: str = "today 12-m") -> str:
        kw_list = [k.strip() for k in keywords.split(",")][:5]

        try:
            from pytrends.request import TrendReq
            import numpy as np

            pytrends = TrendReq(hl="en-IN", tz=330)
            pytrends.build_payload(kw_list, cat=0, timeframe=timeframe, geo="IN")

            iot = pytrends.interest_over_time()
            rising_queries = pytrends.related_queries()

            result: dict = {
                "keywords": kw_list,
                "avg_interest": {},
                "recent_30d_interest": {},
                "velocity": {},
                "related_rising": {},
                "timeframe": timeframe,
            }

            if not iot.empty:
                for kw in kw_list:
                    if kw in iot.columns:
                        values = iot[kw].values
                        avg = float(np.mean(values))
                        recent = float(np.mean(values[-4:]))  # Last ~30 days
                        prev = float(np.mean(values[-8:-4]))   # Prev 30 days

                        result["avg_interest"][kw] = round(avg, 1)
                        result["recent_30d_interest"][kw] = round(recent, 1)

                        if prev == 0:
                            velocity = "rising" if recent > 0 else "stable"
                        elif recent / prev > 1.20:
                            velocity = "rising"
                        elif recent / prev < 0.80:
                            velocity = "declining"
                        else:
                            velocity = "stable"
                        result["velocity"][kw] = velocity

            for kw in kw_list:
                if kw in rising_queries and rising_queries[kw].get("rising") is not None:
                    df = rising_queries[kw]["rising"]
                    if df is not None and not df.empty:
                        result["related_rising"][kw] = df["query"].head(5).tolist()

            return json.dumps(result)

        except ImportError:
            return json.dumps({"error": "pytrends not installed", "keywords": kw_list})
        except Exception as e:
            logger.error("Google Trends error", keywords=kw_list, error=str(e))
            return json.dumps({"error": str(e), "keywords": kw_list})


class RedditTool(BaseTool):
    name: str = "Reddit Consumer Intelligence"
    description: str = (
        "Searches Reddit for consumer discussions about a product category in Indian subreddits. "
        "Returns top posts with title, body, score, and URL. "
        "Input: query string. Optional subreddits (comma-separated) and limit."
    )

    def _run(
        self,
        query: str,
        subreddits: str = "india,indiasocial,IndianFood,FitIndia,IndianBeautyDeals,DesiFitness",
        limit: int = 20,
    ) -> str:
        if not settings.REDDIT_CLIENT_ID or not settings.REDDIT_CLIENT_SECRET:
            return json.dumps({
                "warning": "Reddit credentials not set — skipping Reddit search",
                "posts": [],
                "total": 0,
            })

        try:
            import praw

            reddit = praw.Reddit(
                client_id=settings.REDDIT_CLIENT_ID,
                client_secret=settings.REDDIT_CLIENT_SECRET,
                user_agent="ProductIQ/1.0 (by /u/productiq_bot)",
            )

            posts = []
            per_sub = max(3, limit // len(subreddits.split(",")))

            for sub_name in subreddits.split(","):
                try:
                    subreddit = reddit.subreddit(sub_name.strip())
                    for post in subreddit.search(query, sort="relevance", limit=per_sub, time_filter="year"):
                        posts.append({
                            "title": post.title,
                            "body": post.selftext[:600] if post.selftext else "",
                            "score": post.score,
                            "url": post.url,
                            "subreddit": sub_name.strip(),
                            "num_comments": post.num_comments,
                            "created_utc": int(post.created_utc),
                        })
                except Exception:
                    continue

            posts.sort(key=lambda x: x["score"], reverse=True)
            posts = posts[:limit]

            return json.dumps({"posts": posts, "total": len(posts), "query": query})

        except Exception as e:
            logger.error("Reddit error", query=query, error=str(e))
            return json.dumps({"error": str(e), "posts": [], "total": 0})


class IndiaMArtTool(BaseTool):
    name: str = "IndiaMart Supplier Search"
    description: str = (
        "Searches IndiaMart for manufacturers and suppliers of a product/ingredient. "
        "Returns company name, product, location, and profile URL. "
        "Input: query string (e.g. 'whey protein manufacturer India')."
    )

    def _run(self, query: str) -> str:
        import httpx
        from bs4 import BeautifulSoup
        from fake_useragent import UserAgent

        ua = UserAgent()
        url = f"https://dir.indiamart.com/search.mp?ss={query.replace(' ', '+')}"
        headers = {
            "User-Agent": ua.random,
            "Accept-Language": "en-IN",
        }

        try:
            resp = httpx.get(url, headers=headers, timeout=20, follow_redirects=True)
            soup = BeautifulSoup(resp.text, "html.parser")

            suppliers = []
            cards = soup.select(".card.bx, .lst-cont-3col .lst")[:15]

            for card in cards:
                try:
                    name_el = card.select_one(".lcname, .prd-name")
                    company_el = card.select_one(".companyname, .comp-name")
                    loc_el = card.select_one(".imt-text-14.text-color, .locname")
                    link_el = card.select_one("a[href]")
                    price_el = card.select_one(".price, .prc")

                    suppliers.append({
                        "company_name": company_el.get_text(strip=True) if company_el else None,
                        "product_name": name_el.get_text(strip=True) if name_el else None,
                        "location": loc_el.get_text(strip=True) if loc_el else None,
                        "platform": "indiamart",
                        "profile_url": link_el["href"] if link_el else None,
                        "price_range": price_el.get_text(strip=True) if price_el else None,
                    })
                except Exception:
                    continue

            # Filter out entries with no company name
            suppliers = [s for s in suppliers if s.get("company_name")]

            return json.dumps({"suppliers": suppliers, "total": len(suppliers), "query": query})

        except Exception as e:
            logger.error("IndiaMart scrape error", query=query, error=str(e))
            return json.dumps({"error": str(e), "suppliers": [], "total": 0})