"""
ProductIQ — RAG Query Engine
rag/query.py

Queries the pgvector embeddings table to answer user questions about
their report data using semantic search + Gemini synthesis.
"""
import json
import structlog
from typing import Optional

logger = structlog.get_logger()


def query_rag(question: str, run_id: Optional[str] = None, user_id: str = "") -> str:
    """
    Answer a question using RAG over the user's report data.

    1. Embed the question using Gemini embedding
    2. Search pgvector for similar documents (scoped to run_id if provided)
    3. Pass the retrieved context + question to Gemini for synthesis
    4. Return the answer

    Falls back to a generic response if RAG is not available.
    """
    try:
        from llama_index.embeddings.gemini import GeminiEmbedding
        from llama_index.vector_stores.supabase import SupabaseVectorStore
        from llama_index.core import VectorStoreIndex, Settings
        from config import settings
        from database import get_supabase

        # Configure embedding model
        embed_model = GeminiEmbedding(
            model_name="models/embedding-001",
            api_key=settings.GEMINI_API_KEY,
        )

        # Connect to the vector store
        vector_store = SupabaseVectorStore(
            postgres_connection_string=settings.DATABASE_URL,
            collection_name="embeddings",
            dimension=768,
        )

        # Build index
        index = VectorStoreIndex.from_vector_store(vector_store, embed_model=embed_model)

        # Create query engine with optional metadata filter
        if run_id:
            # Filter to specific run's documents
            from llama_index.core.vector_stores import MetadataFilters, MetadataFilter
            filters = MetadataFilters(filters=[
                MetadataFilter(key="run_id", value=run_id)
            ])
            query_engine = index.as_query_engine(filters=filters, similarity_top_k=5)
        else:
            query_engine = index.as_query_engine(similarity_top_k=5)

        # Query
        response = query_engine.query(question)
        answer = str(response)

        logger.info("RAG query answered", question=question[:80], run_id=run_id, answer_len=len(answer))
        return answer

    except Exception as exc:
        logger.warning("RAG query failed", error=str(exc)[:200])
        raise
