"""
ProductIQ — RAG Retriever Tool
CrewAI tool wrapper for semantic search over the pgvector knowledge base.
"""

import json
from crewai.tools import BaseTool
import structlog

logger = structlog.get_logger()


class RAGRetrieverTool(BaseTool):
    name: str = "RAG Knowledge Retriever"
    description: str = (
        "Semantically retrieves the most relevant product intelligence from the pgvector knowledge base. "
        "Use for finding relevant reviews, competitor data, trends, and regulations. "
        "Input: query (semantic search query string). Optional top_k (default 10)."
    )

    def _run(self, query: str, top_k: int = 10) -> str:
        try:
            from rag.pipeline import get_rag_index

            index = get_rag_index()
            retriever = index.as_retriever(similarity_top_k=top_k)
            nodes = retriever.retrieve(query)

            results = []
            for node in nodes:
                results.append({
                    "text": node.text[:800],
                    "score": round(float(node.score), 3) if node.score else None,
                    "metadata": node.metadata,
                    "source_type": node.metadata.get("source_type", "unknown"),
                })

            results.sort(key=lambda x: x.get("score") or 0, reverse=True)

            return json.dumps({
                "query": query,
                "results": results,
                "count": len(results),
            })

        except RuntimeError as e:
            # RAG unavailable — return empty but don't crash
            logger.warning("RAG retriever unavailable", error=str(e))
            return json.dumps({
                "query": query,
                "results": [],
                "count": 0,
                "warning": str(e),
            })
        except Exception as e:
            logger.error("RAG retriever error", query=query, error=str(e))
            return json.dumps({"error": str(e), "results": [], "count": 0})