"""
ProductIQ — RAG Pipeline (LlamaIndex + pgvector)
"""

from llama_index.core import VectorStoreIndex, Settings as LlamaSettings
from llama_index.embeddings.gemini import GeminiEmbedding
from llama_index.llms.gemini import Gemini
from config import settings
import structlog

logger = structlog.get_logger()

_rag_index = None


def _configure_llama():
    """Configure Gemini embedding + LLM for LlamaIndex."""
    LlamaSettings.embed_model = GeminiEmbedding(
        model_name="models/embedding-001",
        api_key=settings.GEMINI_API_KEY,
    )
    LlamaSettings.llm = Gemini(
        model="models/gemini-2.5-pro",
        api_key=settings.GEMINI_API_KEY,
    )
    LlamaSettings.chunk_size = 512
    LlamaSettings.chunk_overlap = 50


def get_rag_index() -> VectorStoreIndex:
    """
    Returns a LlamaIndex VectorStoreIndex backed by Supabase pgvector.
    Uses module-level singleton to avoid re-initialising on every tool call.
    """
    global _rag_index
    if _rag_index is not None:
        return _rag_index

    try:
        from llama_index.vector_stores.supabase import SupabaseVectorStore

        _configure_llama()

        vector_store = SupabaseVectorStore(
            postgres_connection_string=settings.DATABASE_URL,
            collection_name="embeddings",
            dimension=768,
        )

        _rag_index = VectorStoreIndex.from_vector_store(vector_store)
        logger.info("RAG index initialised from pgvector")
        return _rag_index

    except Exception as e:
        logger.error("RAG index init failed", error=str(e))
        raise RuntimeError(f"RAG pipeline unavailable: {e}")
