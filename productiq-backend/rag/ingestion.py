"""
ProductIQ — RAG Ingestion
Ingests run data (reviews, competitors, trends) into pgvector after agents 1-4 complete.
"""

from llama_index.core import Document
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.gemini import GeminiEmbedding
from config import settings
from database import get_supabase
import structlog

logger = structlog.get_logger()


def ingest_run_data(run_id: str) -> int:
    """
    After agents 1–4 complete, ingest their structured outputs into pgvector
    so Agent 5 (Insight Synthesizer) can use semantic search over the full dataset.

    Returns the total number of documents ingested.
    """
    try:
        from llama_index.vector_stores.supabase import SupabaseVectorStore

        db = get_supabase()
        documents = []

        # ── Ingest reviews ────────────────────────────────────────────────
        reviews = (
            db.table("reviews")
            .select("body, rating, sentiment_label, title")
            .eq("run_id", run_id)
            .limit(2000)
            .execute()
            .data
        )
        for rev in reviews:
            body = rev.get("body", "")
            if body and len(body) > 10:
                text = f"Review (rating {rev.get('rating', '?')}/5, {rev.get('sentiment_label', '')}): {body}"
                documents.append(Document(
                    text=text,
                    metadata={
                        "source_type": "review",
                        "run_id": run_id,
                        "rating": rev.get("rating"),
                        "sentiment": rev.get("sentiment_label"),
                    },
                ))

        # ── Ingest review clusters ────────────────────────────────────────
        clusters = (
            db.table("review_clusters")
            .select("topic_label, topic_type, representative_words, avg_sentiment, review_count, sample_reviews")
            .eq("run_id", run_id)
            .execute()
            .data
        )
        for cluster in clusters:
            words = cluster.get("representative_words", [])
            samples = cluster.get("sample_reviews", [])
            text = (
                f"Topic cluster ({cluster.get('topic_type', 'neutral')}): {cluster.get('topic_label', '')}. "
                f"Key words: {', '.join(words[:6])}. "
                f"Review count: {cluster.get('review_count', 0)}. "
                f"Avg sentiment: {cluster.get('avg_sentiment', 0):.2f}. "
                f"Samples: {' | '.join(str(s)[:150] for s in samples[:2])}"
            )
            documents.append(Document(
                text=text,
                metadata={"source_type": "cluster", "run_id": run_id, "topic_type": cluster.get("topic_type")},
            ))

        # ── Ingest competitors ────────────────────────────────────────────
        competitors = (
            db.table("competitors")
            .select("brand_name, price_inr, rating, key_strengths, key_weaknesses, positioning_statement")
            .eq("run_id", run_id)
            .execute()
            .data
        )
        for comp in competitors:
            text = (
                f"Competitor: {comp.get('brand_name', '')}. "
                f"Price: ₹{comp.get('price_inr', 0):,.0f}. "
                f"Rating: {comp.get('rating', 'N/A')}. "
                f"Strengths: {', '.join(comp.get('key_strengths', [])[:3])}. "
                f"Weaknesses: {', '.join(comp.get('key_weaknesses', [])[:3])}. "
                f"Positioning: {comp.get('positioning_statement', '')}"
            )
            documents.append(Document(
                text=text,
                metadata={"source_type": "competitor", "run_id": run_id},
            ))

        # ── Ingest trends ─────────────────────────────────────────────────
        trends = (
            db.table("trends")
            .select("trend_keyword, source, velocity, trend_score, related_topics")
            .eq("run_id", run_id)
            .execute()
            .data
        )
        for trend in trends:
            text = (
                f"Trend: {trend.get('trend_keyword', '')}. "
                f"Source: {trend.get('source', '')}. "
                f"Velocity: {trend.get('velocity', '')}. "
                f"Score: {trend.get('trend_score', 0)}. "
                f"Related: {', '.join(trend.get('related_topics', [])[:5])}"
            )
            documents.append(Document(
                text=text,
                metadata={"source_type": "trend", "run_id": run_id},
            ))

        if not documents:
            logger.warning("No documents to ingest", run_id=run_id)
            return 0

        # ── Build and run ingestion pipeline ─────────────────────────────
        embed_model = GeminiEmbedding(
            model_name="models/embedding-001",
            api_key=settings.GEMINI_API_KEY,
        )
        vector_store = SupabaseVectorStore(
            postgres_connection_string=settings.DATABASE_URL,
            collection_name="embeddings",
            dimension=768,
        )

        pipeline = IngestionPipeline(
            transformations=[
                SentenceSplitter(chunk_size=512, chunk_overlap=50),
                embed_model,
            ],
            vector_store=vector_store,
        )
        pipeline.run(documents=documents)

        logger.info("RAG ingestion complete", run_id=run_id, total=len(documents))
        return len(documents)

    except Exception as e:
        logger.error("RAG ingestion error", run_id=run_id, error=str(e))
        return 0
