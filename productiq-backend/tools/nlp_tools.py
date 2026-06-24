"""
ProductIQ — NLP Tools
Sentiment analysis (Gemini-based), BERTopic clustering, spaCy NER, price elasticity modelling.

D3: SentimentAnalysisTool now uses Gemini instead of VADER for:
  - Better accuracy on Indian English reviews (VADER has 38% error rate)
  - Sarcasm and context detection
  - Aspect-based sentiment (e.g., "delivery was fast but quality is poor")

Falls back to VADER if Gemini is unavailable (e.g., no API key).
"""

import json
from crewai.tools import BaseTool
from typing import List
import structlog

logger = structlog.get_logger()


class SentimentAnalysisTool(BaseTool):
    name: str = "Sentiment Analyser"
    description: str = (
        "Analyses sentiment of a list of text reviews using Gemini LLM. "
        "Returns score (-1 to 1) and label (positive/negative/neutral) for each review, "
        "plus an aggregate summary with aspect-based insights. "
        "Input: reviews_json — JSON string of list of review dicts, each with a 'body' field."
    )

    def _run(self, reviews_json: str) -> str:
        try:
            # Handle both string and dict input
            if isinstance(reviews_json, str):
                data = json.loads(reviews_json)
            else:
                data = reviews_json

            reviews = data if isinstance(data, list) else data.get("reviews", data.get("enriched_reviews", []))

            if not reviews:
                return json.dumps({"enriched_reviews": [], "summary": {}})

            # Try Gemini-based sentiment first, fall back to VADER
            try:
                return self._analyze_with_gemini(reviews)
            except Exception as gemini_err:
                logger.warning("Gemini sentiment failed, falling back to VADER",
                               error=str(gemini_err)[:120])
                return self._analyze_with_vader(reviews)

        except Exception as e:
            logger.error("Sentiment analysis error", error=str(e))
            return json.dumps({"error": str(e), "enriched_reviews": [], "summary": {}})

    def _analyze_with_gemini(self, reviews: list) -> str:
        """Use Gemini to analyze sentiment in batches of 10 reviews."""
        from llm_utils import call_with_retry
        import google.generativeai as genai
        from config import settings

        # Configure Gemini with the primary key
        api_key = settings.GEMINI_API_KEY
        if not api_key or api_key == "your_gemini_api_key_here":
            raise RuntimeError("No Gemini API key configured")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        results = []
        batch_size = 10

        for i in range(0, len(reviews), batch_size):
            batch = reviews[i:i + batch_size]
            batch_results = self._analyze_batch_gemini(model, batch, call_with_retry)
            results.extend(batch_results)

        # Compute aggregate summary
        pos = sum(1 for r in results if r.get("sentiment_label") == "positive")
        neg = sum(1 for r in results if r.get("sentiment_label") == "negative")
        neu = len(results) - pos - neg
        total = len(results)

        avg_score = round(
            sum(r.get("sentiment_score", 0) for r in results) / total, 3
        ) if total else 0.0

        return json.dumps({
            "enriched_reviews": results,
            "summary": {
                "total": total,
                "positive": pos,
                "negative": neg,
                "neutral": neu,
                "positive_pct": round(pos / total * 100, 1) if total else 0,
                "negative_pct": round(neg / total * 100, 1) if total else 0,
                "neutral_pct": round(neu / total * 100, 1) if total else 0,
                "avg_score": avg_score,
                "method": "gemini",
            }
        })

    def _analyze_batch_gemini(self, model, batch: list, retry_fn) -> list:
        """Analyze a batch of reviews with a single Gemini call."""
        # Build the prompt
        reviews_text = []
        for idx, rev in enumerate(batch):
            text = (rev.get("body", "") or rev.get("text", ""))[:500]
            reviews_text.append(f"[{idx}] {text}")

        prompt = f"""Analyze the sentiment of each review below. For each review, return a JSON array where each element has:
  - "index": the review number
  - "sentiment_score": a float from -1.0 (very negative) to 1.0 (very positive)
  - "sentiment_label": "positive", "negative", or "neutral"
  - "aspects": list of aspect strings mentioned (e.g., ["delivery", "quality", "price"])

Reviews:
{chr(10).join(reviews_text)}

Return ONLY a JSON array, no markdown formatting."""

        try:
            response = retry_fn(model.generate_content, prompt)
            response_text = response.text.strip()

            # Strip markdown codeblock if present
            if response_text.startswith("```"):
                response_text = response_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            sentiments = json.loads(response_text)

            # Map back to original reviews
            results = []
            for idx, rev in enumerate(batch):
                sent = next((s for s in sentiments if s.get("index") == idx), None)
                if sent:
                    results.append({
                        **rev,
                        "sentiment_score": round(float(sent.get("sentiment_score", 0)), 3),
                        "sentiment_label": sent.get("sentiment_label", "neutral"),
                        "aspects": sent.get("aspects", []),
                    })
                else:
                    results.append({
                        **rev,
                        "sentiment_score": 0.0,
                        "sentiment_label": "neutral",
                        "aspects": [],
                    })

            return results

        except Exception as batch_err:
            logger.warning("Gemini batch failed, using VADER for this batch",
                           error=str(batch_err)[:100])
            return self._analyze_batch_vader(batch)

    def _analyze_with_vader(self, reviews: list) -> str:
        """VADER fallback — original implementation."""
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        import numpy as np

        analyzer = SentimentIntensityAnalyzer()
        results = self._analyze_batch_vader(reviews, analyzer)

        pos = sum(1 for r in results if r.get("sentiment_label") == "positive")
        neg = sum(1 for r in results if r.get("sentiment_label") == "negative")
        neu = len(results) - pos - neg
        total = len(results)

        avg_score = round(
            float(np.mean([r["sentiment_score"] for r in results])), 3
        ) if results else 0.0

        return json.dumps({
            "enriched_reviews": results,
            "summary": {
                "total": total,
                "positive": pos,
                "negative": neg,
                "neutral": neu,
                "positive_pct": round(pos / total * 100, 1) if total else 0,
                "negative_pct": round(neg / total * 100, 1) if total else 0,
                "neutral_pct": round(neu / total * 100, 1) if total else 0,
                "avg_score": avg_score,
                "method": "vader",
            }
        })

    def _analyze_batch_vader(self, reviews: list, analyzer=None) -> list:
        """Analyze a batch of reviews with VADER."""
        if analyzer is None:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
            analyzer = SentimentIntensityAnalyzer()

        results = []
        for rev in reviews:
            text = rev.get("body", "") or rev.get("text", "")
            if not text:
                continue
            scores = analyzer.polarity_scores(text)
            compound = scores["compound"]
            label = "positive" if compound >= 0.05 else ("negative" if compound <= -0.05 else "neutral")
            results.append({
                **rev,
                "sentiment_score": round(compound, 3),
                "sentiment_label": label,
                "vader_scores": {
                    "pos": round(scores["pos"], 3),
                    "neg": round(scores["neg"], 3),
                    "neu": round(scores["neu"], 3),
                }
            })
        return results


class BERTopicClusterTool(BaseTool):
    name: str = "Review Topic Clusterer"
    description: str = (
        "Clusters review texts into topics using BERTopic. "
        "Returns topic labels, representative words, sentiment per cluster, and sample reviews. "
        "Input: reviews_json — JSON string with 'reviews' list or list of review dicts. "
        "Optional n_topics (default 12)."
    )

    def _run(self, reviews_json: str, n_topics: int = 12) -> str:
        try:
            from bertopic import BERTopic
            import numpy as np

            if isinstance(reviews_json, str):
                data = json.loads(reviews_json)
            else:
                data = reviews_json

            reviews = data if isinstance(data, list) else data.get("reviews", data.get("enriched_reviews", []))

            docs = []
            review_map = {}
            for i, rev in enumerate(reviews):
                body = rev.get("body", "") or rev.get("text", "")
                if len(body) > 20:
                    review_map[len(docs)] = rev
                    docs.append(body)

            if len(docs) < 10:
                return json.dumps({
                    "error": f"Not enough reviews for clustering — need at least 10, got {len(docs)}",
                    "clusters": [],
                    "total_clusters": 0,
                })

            # BERTopic with reduced complexity for speed
            topic_model = BERTopic(
                nr_topics=min(n_topics, len(docs) // 3),
                min_topic_size=max(3, len(docs) // 20),
                verbose=False,
                calculate_probabilities=False,
            )
            topics, _ = topic_model.fit_transform(docs)

            topic_info = topic_model.get_topic_info()
            clusters = []

            for _, row in topic_info.iterrows():
                topic_id = int(row["Topic"])
                if topic_id == -1:
                    continue

                words = [word for word, _ in topic_model.get_topic(topic_id)][:8]
                topic_docs_idx = [i for i, t in enumerate(topics) if t == topic_id]
                topic_reviews = [review_map[i] for i in topic_docs_idx if i in review_map]

                # Calculate avg sentiment for cluster
                sentiments = [r.get("sentiment_score", 0) for r in topic_reviews if r.get("sentiment_score") is not None]
                avg_sentiment = round(float(np.mean(sentiments)), 3) if sentiments else 0.0

                cluster = {
                    "topic_id": topic_id,
                    "topic_label": " / ".join(words[:3]),
                    "representative_words": words,
                    "review_count": len(topic_docs_idx),
                    "avg_sentiment": avg_sentiment,
                    "sample_reviews": [r.get("body", "")[:300] for r in topic_reviews[:3]],
                    # topic_type will be assigned by the LLM agent based on words/sentiment
                    "topic_type": (
                        "pain_point" if avg_sentiment < -0.05 else
                        "praise" if avg_sentiment > 0.2 else
                        "neutral"
                    ),
                }
                clusters.append(cluster)

            clusters.sort(key=lambda x: x["review_count"], reverse=True)

            return json.dumps({
                "clusters": clusters,
                "total_clusters": len(clusters),
                "total_reviews_clustered": len(docs),
            })

        except Exception as e:
            logger.error("BERTopic clustering error", error=str(e))
            return json.dumps({"error": str(e), "clusters": [], "total_clusters": 0})


class SpacyNERTool(BaseTool):
    name: str = "Product Feature Extractor"
    description: str = (
        "Extracts product features, ingredients, and attributes from review text using spaCy NER. "
        "Returns named entities and key noun chunks. "
        "Input: text string (review body or concatenated reviews)."
    )

    def _run(self, text: str) -> str:
        try:
            import spacy

            try:
                nlp = spacy.load("en_core_web_sm")
            except OSError:
                return json.dumps({
                    "error": "spaCy model not found. Run: python -m spacy download en_core_web_sm",
                    "entities": [],
                    "noun_chunks": [],
                })

            # Limit text length to avoid memory issues
            doc = nlp(text[:8000])

            entities = [
                {"text": ent.text, "label": ent.label_, "description": spacy.explain(ent.label_)}
                for ent in doc.ents
                if len(ent.text) > 2
            ]

            noun_chunks = list(set([
                chunk.text.lower()
                for chunk in doc.noun_chunks
                if len(chunk.text) > 3 and not chunk.text.lower().startswith("the ")
            ]))

            return json.dumps({
                "entities": entities[:50],
                "noun_chunks": noun_chunks[:40],
                "total_entities": len(entities),
            })

        except Exception as e:
            logger.error("spaCy NER error", error=str(e))
            return json.dumps({"error": str(e), "entities": [], "noun_chunks": []})


class ElasticityModelTool(BaseTool):
    name: str = "Price Elasticity Modeller"
    description: str = (
        "Models price elasticity from historical price and review count (demand proxy) data. "
        "Returns optimal price recommendation and elasticity coefficient. "
        "Input: price_data_json — JSON list of dicts with 'price_inr' and 'review_count' fields."
    )

    def _run(self, price_data_json: str) -> str:
        try:
            from scipy import stats
            import numpy as np

            if isinstance(price_data_json, str):
                data = json.loads(price_data_json)
            else:
                data = price_data_json

            records = data if isinstance(data, list) else data.get("data", [])

            prices = [float(d["price_inr"]) for d in records if d.get("price_inr") and d.get("review_count")]
            demand = [float(d["review_count"]) for d in records if d.get("price_inr") and d.get("review_count")]

            if len(prices) < 3:
                return json.dumps({
                    "error": f"Insufficient data points: need at least 3, got {len(prices)}",
                    "recommendation": "Gather more price-demand data before modelling.",
                })

            slope, intercept, r_value, p_value, std_err = stats.linregress(prices, demand)

            # Optimal price at maximum revenue = price * demand
            # d(price * demand)/d(price) = 0 → slope*price^2 + intercept*price = max
            # For linear demand: revenue = P * (slope*P + intercept) → maximised at P = -intercept/(2*slope)
            optimal_price = None
            if slope < 0 and intercept > 0:
                optimal_price = round(-intercept / (2 * slope), 0)

            # Price range analysis
            price_min, price_max = min(prices), max(prices)
            demand_at_min = slope * price_min + intercept
            demand_at_max = slope * price_max + intercept

            return json.dumps({
                "slope": round(slope, 4),
                "intercept": round(intercept, 2),
                "r_squared": round(r_value ** 2, 3),
                "p_value": round(p_value, 4),
                "is_statistically_significant": p_value < 0.05,
                "optimal_price_inr": optimal_price,
                "interpretation": "negative slope = higher price → lower demand (normal elastic)" if slope < 0 else "positive slope = unusual, suggest reviewing data",
                "price_range_analysed": {"min": price_min, "max": price_max},
                "data_points": len(prices),
                "elasticity_coefficient": round(slope * (sum(prices) / len(prices)) / (sum(demand) / len(demand)), 3),
            })

        except Exception as e:
            logger.error("Elasticity model error", error=str(e))
            return json.dumps({"error": str(e)})
