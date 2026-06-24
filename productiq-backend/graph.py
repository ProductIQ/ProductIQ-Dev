"""
ProductIQ — Knowledge Graph Module (JSONB-backed, Neo4j migration-ready)
"""

from database import get_supabase
import structlog

logger = structlog.get_logger()


def add_node(node_type: str, label: str, properties: dict | None = None) -> str:
    """Insert a knowledge graph node. Returns node ID."""
    db = get_supabase()
    result = db.table("knowledge_nodes").insert({
        "node_type": node_type,
        "label": label[:200],
        "properties": properties or {},
    }).execute()
    return result.data[0]["id"]


def add_edge(from_id: str, to_id: str, relationship: str, weight: float = 1.0, properties: dict | None = None) -> str:
    """Insert a directed edge between two nodes. Returns edge ID."""
    db = get_supabase()
    result = db.table("knowledge_edges").insert({
        "from_node": from_id,
        "to_node": to_id,
        "relationship": relationship,
        "weight": weight,
        "properties": properties or {},
    }).execute()
    return result.data[0]["id"]


def find_competitors_sharing_feature(feature_label: str) -> list:
    """
    Traverse: Feature → edges → Competitor nodes.
    Emulates a 2-hop graph query using SQL joins on JSONB columns.

    Neo4j Cypher equivalent when migrating:
        MATCH (f:Feature {label: $label})-[:COMPETES_WITH]->(c:Competitor)
        RETURN c
    """
    db = get_supabase()

    feature = (
        db.table("knowledge_nodes")
        .select("id")
        .eq("node_type", "feature")
        .eq("label", feature_label)
        .maybe_single()
        .execute()
        .data
    )
    if not feature:
        return []

    edges = (
        db.table("knowledge_edges")
        .select("to_node")
        .eq("from_node", feature["id"])
        .execute()
        .data
    )
    node_ids = [e["to_node"] for e in edges]
    if not node_ids:
        return []

    competitors = (
        db.table("knowledge_nodes")
        .select("*")
        .in_("id", node_ids)
        .eq("node_type", "competitor")
        .execute()
        .data
    )
    return competitors


def build_graph_for_run(run_id: str) -> dict:
    """
    Called after the main crew completes.
    Builds the JSONB knowledge graph from the run's data.
    This powers the Knowledge Graph feature in the UI.

    Creates nodes for: brand, competitors, trends, customer_needs (from pain point clusters).
    Creates edges: COMPETES_WITH, AFFECTED_BY, HAS_UNMET_NEED.
    """
    db = get_supabase()
    stats = {"nodes": 0, "edges": 0}

    # Get brand from products
    products = (
        db.table("products")
        .select("brand, category")
        .eq("run_id", run_id)
        .limit(1)
        .execute()
        .data
    )
    if not products:
        logger.warning("No products found for graph build", run_id=run_id)
        return stats

    brand = products[0].get("brand") or "Unknown Brand"
    category = products[0].get("category") or ""

    brand_id = add_node("brand", brand, {"category": category, "run_id": run_id})
    stats["nodes"] += 1

    # Add competitor nodes
    competitors = db.table("competitors").select("brand_name, price_inr, rating").eq("run_id", run_id).execute().data
    for comp in competitors:
        try:
            comp_id = add_node("competitor", comp["brand_name"], {
                "price_inr": comp.get("price_inr"),
                "rating": comp.get("rating"),
                "run_id": run_id,
            })
            add_edge(brand_id, comp_id, "COMPETES_WITH")
            stats["nodes"] += 1
            stats["edges"] += 1
        except Exception as e:
            logger.warning("Failed to add competitor node", brand=comp.get("brand_name"), error=str(e))

    # Add trend nodes
    trends = db.table("trends").select("trend_keyword, velocity, trend_score").eq("run_id", run_id).execute().data
    for trend in trends:
        try:
            trend_id = add_node("trend", trend["trend_keyword"], {
                "velocity": trend.get("velocity"),
                "run_id": run_id,
            })
            weight = float(trend.get("trend_score") or 50) / 100.0
            add_edge(brand_id, trend_id, "AFFECTED_BY", weight=weight)
            stats["nodes"] += 1
            stats["edges"] += 1
        except Exception as e:
            logger.warning("Failed to add trend node", keyword=trend.get("trend_keyword"), error=str(e))

    # Add customer need nodes from pain point clusters
    clusters = (
        db.table("review_clusters")
        .select("topic_label, avg_sentiment, review_count")
        .eq("run_id", run_id)
        .eq("topic_type", "pain_point")
        .execute()
        .data
    )
    for cluster in clusters:
        try:
            need_id = add_node("customer_need", cluster["topic_label"], {
                "avg_sentiment": cluster.get("avg_sentiment"),
                "run_id": run_id,
            })
            weight = float(cluster.get("review_count") or 1)
            add_edge(brand_id, need_id, "HAS_UNMET_NEED", weight=weight)
            stats["nodes"] += 1
            stats["edges"] += 1
        except Exception as e:
            logger.warning("Failed to add customer need node", error=str(e))

    logger.info("Knowledge graph built", run_id=run_id, **stats)
    return stats
