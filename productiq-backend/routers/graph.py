"""
ProductIQ — Knowledge Graph Router
GET /api/graph/{run_id}        — Get full graph (nodes + edges) for a run
GET /api/graph/{run_id}/nodes  — Get nodes filtered by type
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from database import get_supabase
from models import GraphResponse
from typing import Optional

router = APIRouter()


def get_current_user(authorization: str = Header(...)):
    db = get_supabase()
    try:
        return db.auth.get_user(authorization.replace("Bearer ", "").strip()).user
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/{run_id}", response_model=GraphResponse, summary="Get knowledge graph for a run")
async def get_graph(run_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)

    nodes = (
        db.table("knowledge_nodes")
        .select("*")
        .eq("properties->>run_id", run_id)
        .limit(500)
        .execute()
        .data
    )

    if not nodes:
        return GraphResponse(nodes=[], edges=[])

    node_ids = [n["id"] for n in nodes]

    # Fetch all edges between these nodes
    edges = (
        db.table("knowledge_edges")
        .select("*")
        .in_("from_node", node_ids)
        .execute()
        .data
    )

    return GraphResponse(nodes=nodes, edges=edges)


@router.get("/{run_id}/nodes", summary="Get graph nodes for a run filtered by type")
async def get_graph_nodes(
    run_id: str,
    node_type: Optional[str] = Query(None, description="Filter: product|brand|feature|competitor|trend|supplier|ingredient"),
    user=Depends(get_current_user),
):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)

    query = db.table("knowledge_nodes").select("*").eq("properties->>run_id", run_id)
    if node_type:
        query = query.eq("node_type", node_type)

    result = query.limit(200).execute()
    return {"nodes": result.data, "total": len(result.data), "run_id": run_id}


def _verify_ownership(db, run_id: str, user_id: str):
    run = db.table("agent_runs").select("id").eq("id", run_id).eq("user_id", user_id).maybe_single().execute().data
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
