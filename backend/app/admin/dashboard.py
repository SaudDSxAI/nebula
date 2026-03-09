"""
Super Admin - Dashboard & Analytics Routes
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, timedelta
from typing import Dict, Any, List

from app.database import get_db
from app.models.client import Client
from app.models.candidate import Candidate
from app.models.requirement import Requirement
from app.models.candidate import Applicant
from app.models.cv import CVUpload
from app.models.activity import ActivityLog
from app.models.ai import AIInteraction
from app.schemas.analytics import (
    DashboardStats,
    RecentActivityResponse,
    ActivityItem,
    ClientGrowthResponse,
    GrowthDataPoint,
    AnalyticsOverview,
)
from app.middleware.auth import require_super_admin

router = APIRouter(prefix="/api/admin/dashboard", tags=["Super Admin - Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: Dict[str, Any] = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get overall platform statistics for dashboard

    Returns:
    - Total clients (by status and plan)
    - Total candidates, requirements, applications
    - Recent growth metrics
    """
    # Count clients by status
    total_clients_result = await db.execute(
        select(func.count(Client.id)).where(Client.deleted_at.is_(None))
    )
    total_clients = total_clients_result.scalar() or 0

    active_clients_result = await db.execute(
        select(func.count(Client.id)).where(
            Client.deleted_at.is_(None),
            Client.status == "active"
        )
    )
    active_clients = active_clients_result.scalar() or 0

    inactive_clients_result = await db.execute(
        select(func.count(Client.id)).where(
            Client.deleted_at.is_(None),
            Client.status == "inactive"
        )
    )
    inactive_clients = inactive_clients_result.scalar() or 0

    suspended_clients_result = await db.execute(
        select(func.count(Client.id)).where(
            Client.deleted_at.is_(None),
            Client.status == "suspended"
        )
    )
    suspended_clients = suspended_clients_result.scalar() or 0

    # Count clients by plan
    clients_by_plan = {}
    for plan in ["free", "professional", "enterprise"]:
        result = await db.execute(
            select(func.count(Client.id)).where(
                Client.deleted_at.is_(None),
                Client.plan == plan
            )
        )
        clients_by_plan[plan] = result.scalar() or 0

    # Total candidates
    total_candidates_result = await db.execute(
        select(func.count(Candidate.id)).where(Candidate.deleted_at.is_(None))
    )
    total_candidates = total_candidates_result.scalar() or 0

    # Total requirements
    total_requirements_result = await db.execute(
        select(func.count(Requirement.id)).where(Requirement.deleted_at.is_(None))
    )
    total_requirements = total_requirements_result.scalar() or 0

    # Total applications
    total_applications_result = await db.execute(
        select(func.count(Applicant.id)).where(Applicant.deleted_at.is_(None))
    )
    total_applications = total_applications_result.scalar() or 0

    # Total CV uploads
    total_cv_uploads_result = await db.execute(
        select(func.count(CVUpload.id)).where(CVUpload.deleted_at.is_(None))
    )
    total_cv_uploads = total_cv_uploads_result.scalar() or 0

    # New clients this month
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_clients_month_result = await db.execute(
        select(func.count(Client.id)).where(
            Client.deleted_at.is_(None),
            Client.created_at >= month_start
        )
    )
    new_clients_this_month = new_clients_month_result.scalar() or 0

    # New clients this week
    week_start = datetime.utcnow() - timedelta(days=7)
    new_clients_week_result = await db.execute(
        select(func.count(Client.id)).where(
            Client.deleted_at.is_(None),
            Client.created_at >= week_start
        )
    )
    new_clients_this_week = new_clients_week_result.scalar() or 0

    return DashboardStats(
        total_clients=total_clients,
        active_clients=active_clients,
        inactive_clients=inactive_clients,
        suspended_clients=suspended_clients,
        clients_by_plan=clients_by_plan,
        total_candidates=total_candidates,
        total_requirements=total_requirements,
        total_applications=total_applications,
        total_cv_uploads=total_cv_uploads,
        new_clients_this_month=new_clients_this_month,
        new_clients_this_week=new_clients_this_week
    )


@router.get("/recent-activity", response_model=RecentActivityResponse)
async def get_recent_activity(
    limit: int = Query(50, ge=1, le=100, description="Number of activities to return"),
    current_user: Dict[str, Any] = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get recent activity feed

    Returns latest activity logs from all users
    """
    # Get recent activities
    result = await db.execute(
        select(ActivityLog)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    activities = result.scalars().all()

    # Get total count
    total_result = await db.execute(select(func.count(ActivityLog.id)))
    total = total_result.scalar() or 0

    return RecentActivityResponse(
        activities=[ActivityItem.model_validate(activity) for activity in activities],
        total=total
    )


@router.get("/client-growth", response_model=ClientGrowthResponse)
async def get_client_growth(
    period: str = Query("30days", description="Period: 7days, 30days, 90days, 1year"),
    current_user: Dict[str, Any] = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get client growth over time

    Returns daily data points showing:
    - Total clients
    - New clients
    - Active clients
    """
    # Determine date range
    now = datetime.utcnow()
    if period == "7days":
        start_date = now - timedelta(days=7)
        days_count = 7
    elif period == "90days":
        start_date = now - timedelta(days=90)
        days_count = 90
    elif period == "1year":
        start_date = now - timedelta(days=365)
        days_count = 365
    else:  # 30days default
        start_date = now - timedelta(days=30)
        days_count = 30

    data_points: List[GrowthDataPoint] = []

    # Fetch all relevant clients once
    clients_result = await db.execute(
        select(Client.created_at, Client.status).where(Client.deleted_at.is_(None))
    )
    clients_data = clients_result.fetchall()

    for i in range(days_count + 1):
        date = start_date + timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        
        date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_end = date_start + timedelta(days=1)

        total_clients = sum(1 for c in clients_data if c.created_at and c.created_at <= date)
        new_clients = sum(1 for c in clients_data if c.created_at and date_start <= c.created_at < date_end)
        active_clients = sum(1 for c in clients_data if c.created_at and c.created_at <= date and c.status == "active")

        data_points.append(
            GrowthDataPoint(
                date=date_str,
                total_clients=total_clients,
                new_clients=new_clients,
                active_clients=active_clients
            )
        )

    return ClientGrowthResponse(
        period=period,
        data_points=data_points
    )


@router.get("/analytics/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(
    current_user: Dict[str, Any] = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed analytics overview

    Returns comprehensive statistics across all entities
    """
    # Client stats
    client_stats = {}
    client_stats["total"] = (await db.execute(
        select(func.count(Client.id)).where(Client.deleted_at.is_(None))
    )).scalar() or 0

    client_stats["by_status"] = {}
    for status_val in ["active", "inactive", "suspended"]:
        count = (await db.execute(
            select(func.count(Client.id)).where(
                Client.deleted_at.is_(None),
                Client.status == status_val
            )
        )).scalar() or 0
        client_stats["by_status"][status_val] = count

    client_stats["by_plan"] = {}
    for plan in ["free", "professional", "enterprise"]:
        count = (await db.execute(
            select(func.count(Client.id)).where(
                Client.deleted_at.is_(None),
                Client.plan == plan
            )
        )).scalar() or 0
        client_stats["by_plan"][plan] = count

    # Candidate stats
    candidate_stats = {}
    candidate_stats["total"] = (await db.execute(
        select(func.count(Candidate.id)).where(Candidate.deleted_at.is_(None))
    )).scalar() or 0

    candidate_stats["active"] = (await db.execute(
        select(func.count(Candidate.id)).where(
            Candidate.deleted_at.is_(None),
            Candidate.is_active == True
        )
    )).scalar() or 0

    # Requirement stats
    requirement_stats = {}
    requirement_stats["total"] = (await db.execute(
        select(func.count(Requirement.id)).where(Requirement.deleted_at.is_(None))
    )).scalar() or 0

    requirement_stats["by_status"] = {}
    for req_status in ["open", "in_progress", "filled", "closed"]:
        count = (await db.execute(
            select(func.count(Requirement.id)).where(
                Requirement.deleted_at.is_(None),
                Requirement.status == req_status
            )
        )).scalar() or 0
        requirement_stats["by_status"][req_status] = count

    # Application stats
    application_stats = {}
    application_stats["total"] = (await db.execute(
        select(func.count(Applicant.id)).where(Applicant.deleted_at.is_(None))
    )).scalar() or 0

    # AI interaction stats
    ai_stats = {}
    ai_stats["total_interactions"] = (await db.execute(
        select(func.count(AIInteraction.id))
    )).scalar() or 0

    # Top clients by candidate count
    top_clients_result = await db.execute(
        select(
            Client.id,
            Client.company_name,
            Client.plan,
            func.count(Candidate.id).label("candidate_count")
        )
        .join(Candidate, Client.id == Candidate.client_id, isouter=True)
        .where(Client.deleted_at.is_(None))
        .group_by(Client.id, Client.company_name, Client.plan)
        .order_by(func.count(Candidate.id).desc())
        .limit(10)
    )
    top_clients = [
        {
            "id": row[0],
            "company_name": row[1],
            "plan": row[2],
            "candidate_count": row[3]
        }
        for row in top_clients_result.all()
    ]

    return AnalyticsOverview(
        client_stats=client_stats,
        candidate_stats=candidate_stats,
        requirement_stats=requirement_stats,
        application_stats=application_stats,
        ai_interaction_stats=ai_stats,
        top_clients=top_clients
    )
