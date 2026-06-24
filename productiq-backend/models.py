"""
ProductIQ — Pydantic Models
All request / response schemas used by FastAPI routers.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    plan: str = "free"
    reports_used_this_month: int = 0
    reports_limit: int = 3
    extra_reports_from_referrals: int = 0
    referral_code: Optional[str] = None
    razorpay_customer_id: Optional[str] = None
    razorpay_subscription_id: Optional[str] = None
    slack_webhook_url: Optional[str] = None
    created_at: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    slack_webhook_url: Optional[str] = None


# ── Reports / Runs ────────────────────────────────────────────────────────────

class RunRequest(BaseModel):
    product_category: str = Field(..., min_length=3, max_length=100, description="E.g. 'protein powder', 'face wash'")
    brand_name: Optional[str] = Field(None, max_length=100, description="Your brand or a competitor to analyse")
    target_market: str = Field(default="India", description="Target geography")


class RunResponse(BaseModel):
    run_id: str
    status: str
    celery_task_id: Optional[str] = None   # None when running in direct/BackgroundTasks mode
    mode: str = "direct"                    # "celery" | "direct"
    message: str = "Pipeline started. Connect to /api/stream/{run_id} for real-time updates."



class AgentProgressEvent(BaseModel):
    run_id: str
    agent_name: str
    agent_number: int
    status: str  # pending | running | completed | failed
    progress_pct: int
    timestamp: Optional[str] = None


class AgentOutputSchema(BaseModel):
    id: str
    run_id: str
    agent_name: str
    agent_number: int
    status: str
    output: Optional[Any] = None
    tokens_used: Optional[int] = None
    duration_seconds: Optional[float] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class RunDetail(BaseModel):
    id: str
    user_id: str
    product_category: str
    brand_name: Optional[str]
    target_market: str
    status: str
    current_agent: Optional[str]
    progress_pct: int
    error_message: Optional[str]
    celery_task_id: Optional[str]
    started_at: Optional[str]
    completed_at: Optional[str]
    created_at: str


class ReportResponse(BaseModel):
    run_id: str
    pdf_url: Optional[str] = None
    pptx_url: Optional[str] = None
    page_count: Optional[int] = None
    is_watermarked: bool = False
    created_at: str


# ── Products ──────────────────────────────────────────────────────────────────

class ProductSchema(BaseModel):
    id: str
    platform: str
    product_name: str
    brand: Optional[str]
    category: Optional[str]
    price_inr: Optional[float]
    mrp_inr: Optional[float]
    rating: Optional[float]
    review_count: Optional[int]
    in_stock: bool = True
    images: List[str] = []
    url: Optional[str]
    specs: Optional[Any]
    scraped_at: str


class ReviewSchema(BaseModel):
    id: str
    platform: str
    reviewer_name: Optional[str]
    rating: Optional[int]
    title: Optional[str]
    body: str
    verified_purchase: bool
    sentiment_score: Optional[float]
    sentiment_label: Optional[str]
    topics: List[str] = []
    reviewed_at: Optional[str]


# ── Payments ─────────────────────────────────────────────────────────────────

class OrderRequest(BaseModel):
    plan: str  # "pro_monthly" | "pay_per_report" | "enterprise"


class OrderResponse(BaseModel):
    order_id: str
    amount: int  # in paise
    currency: str = "INR"
    key: str     # Razorpay public key — safe to expose


class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str


class VerifyResponse(BaseModel):
    status: str
    plan_activated: str
    message: str


# ── Sentiment ─────────────────────────────────────────────────────────────────

class SentimentScoreSchema(BaseModel):
    id: str
    brand_name: str
    platform: str
    score: float
    positive_pct: Optional[float]
    negative_pct: Optional[float]
    neutral_pct: Optional[float]
    post_count: Optional[int]
    alert_sent: bool
    scored_at: str


# ── Knowledge Graph ───────────────────────────────────────────────────────────

class KnowledgeNodeSchema(BaseModel):
    id: str
    node_type: str
    label: str
    properties: Optional[Any]
    created_at: str


class KnowledgeEdgeSchema(BaseModel):
    id: str
    from_node: str
    to_node: str
    relationship: str
    weight: float
    properties: Optional[Any]
    created_at: str


class GraphResponse(BaseModel):
    nodes: List[KnowledgeNodeSchema]
    edges: List[KnowledgeEdgeSchema]


# ── Referral ──────────────────────────────────────────────────────────────────

class ReferralRequest(BaseModel):
    referral_code: str


class ReferralResponse(BaseModel):
    success: bool
    extra_reports_added: int
    message: str