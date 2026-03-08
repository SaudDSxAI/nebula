"""
Analytics Schemas
"""
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime


# Dashboard Stats
class DashboardStats(BaseModel):
    total_clients: int
    active_clients: int
    inactive_clients: int
    suspended_clients: int
    clients_by_plan: Dict[str, int]
    total_candidates: int
    total_requirements: int
    total_applications: int
    total_cv_uploads: int
    new_clients_this_month: int
    new_clients_this_week: int


# Activity Item
class ActivityItem(BaseModel):
    id: int
    user_type: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Recent Activity Response
class RecentActivityResponse(BaseModel):
    activities: List[ActivityItem]
    total: int


# Client Growth Data Point
class GrowthDataPoint(BaseModel):
    date: str  # YYYY-MM-DD
    total_clients: int
    new_clients: int
    active_clients: int


# Client Growth Response
class ClientGrowthResponse(BaseModel):
    period: str  # "7days", "30days", "90days", "1year"
    data_points: List[GrowthDataPoint]


# Analytics Overview
class AnalyticsOverview(BaseModel):
    client_stats: Dict[str, Any]
    candidate_stats: Dict[str, Any]
    requirement_stats: Dict[str, Any]
    application_stats: Dict[str, Any]
    ai_interaction_stats: Dict[str, Any]
    top_clients: List[Dict[str, Any]]
