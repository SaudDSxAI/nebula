"""
Client Dashboard Routes
Matches coter-global-agent exactly:
  - /charts  → stats + roles distribution (for stat cards + role chart)
  - /timeline → configurable period (days/months/years) timeline
  - /export/candidates.csv → CSV export
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, distinct, extract
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import csv
import io

from app.database import get_db
from app.models.requirement import Requirement
from app.models.candidate import Candidate, Applicant
from app.middleware.auth import require_client

router = APIRouter(prefix="/api/client/dashboard", tags=["Client Dashboard"])


# ═══════════════════════════════════════════════════════════
#   CHARTS — stats + roles (for dashboard tab)
# ═══════════════════════════════════════════════════════════

@router.get("/charts")
async def get_dashboard_charts(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Dashboard data for stat cards + role chart.
    Matches old app: stats (available, total_reqs, open_reqs, unassigned) + roles distribution.
    """
    client_id = current_user["client_id"]
    cand_base = [Candidate.client_id == client_id, Candidate.deleted_at.is_(None)]
    req_base = [Requirement.client_id == client_id, Requirement.deleted_at.is_(None)]

    # ── Candidate counts ──
    total_cand = (await db.execute(select(func.count(Candidate.id)).where(*cand_base))).scalar() or 0

    assigned_cand = (await db.execute(
        select(func.count(distinct(Applicant.candidate_id))).select_from(Applicant).join(
            Candidate, Candidate.id == Applicant.candidate_id
        ).where(
            Candidate.client_id == client_id,
            Applicant.deleted_at.is_(None),
            Applicant.status.notin_(["rejected", "withdrawn"])
        )
    )).scalar() or 0

    available = max(total_cand - assigned_cand, 0)

    # ── Requirement counts ──
    total_reqs = (await db.execute(select(func.count(Requirement.id)).where(*req_base))).scalar() or 0
    open_reqs = (await db.execute(select(func.count(Requirement.id)).where(*req_base, Requirement.status == "open"))).scalar() or 0
    in_progress = (await db.execute(select(func.count(Requirement.id)).where(*req_base, Requirement.status == "in_progress"))).scalar() or 0
    unassigned_reqs = (await db.execute(
        select(func.count(Requirement.id)).where(*req_base, Requirement.assigned_to_user_id.is_(None))
    )).scalar() or 0

    # ── Roles distribution (top 10) ──
    roles_result = await db.execute(
        select(
            Candidate.current_title,
            func.count(Candidate.id).label("count")
        ).where(
            *cand_base, Candidate.current_title.isnot(None), Candidate.current_title != ""
        ).group_by(Candidate.current_title).order_by(desc("count")).limit(10)
    )
    roles = [{"role": row.current_title or "Other", "count": row.count} for row in roles_result]

    return {
        "roles_distribution": roles,
        "summary": {
            "total_candidates": total_cand,
            "assigned_candidates": assigned_cand,
            "available_candidates": available,
            "total_requirements": total_reqs,
            "active_requirements": open_reqs + in_progress,
            "open_requirements": open_reqs,
            "in_progress_requirements": in_progress,
            "unassigned_requirements": unassigned_reqs,
        }
    }


# ═══════════════════════════════════════════════════════════
#   TIMELINE — configurable period (days/months/years)
# ═══════════════════════════════════════════════════════════

@router.get("/timeline")
async def get_timeline_data(
    period: str = Query("days", pattern="^(days|months|years)$"),
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Candidate additions over time — matches old app's timeline with period toggle.
    - days: last 30 days, daily granularity
    - months: last 12 months, monthly granularity
    - years: all time, yearly granularity
    """
    client_id = current_user["client_id"]
    base = [Candidate.client_id == client_id, Candidate.deleted_at.is_(None)]

    if period == "days":
        start = datetime.utcnow() - timedelta(days=30)
        result = await db.execute(
            select(
                func.date_trunc('day', Candidate.created_at).label('date_val'),
                func.count(Candidate.id).label('count')
            ).where(*base, Candidate.created_at >= start)
            .group_by('date_val').order_by('date_val')
        )
        timeline = [{"label": row.date_val.strftime("%b %d"), "count": row.count} for row in result]

    elif period == "years":
        result = await db.execute(
            select(
                extract('year', Candidate.created_at).label('year_val'),
                func.count(Candidate.id).label('count')
            ).where(*base, Candidate.created_at.isnot(None))
            .group_by('year_val').order_by('year_val')
        )
        timeline = [{"label": str(int(row.year_val)), "count": row.count} for row in result]

    else:  # months
        start = datetime.utcnow() - timedelta(days=365)
        result = await db.execute(
            select(
                func.date_trunc('month', Candidate.created_at).label('month_val'),
                func.count(Candidate.id).label('count')
            ).where(*base, Candidate.created_at >= start)
            .group_by('month_val').order_by('month_val')
        )
        timeline = [{"label": row.month_val.strftime("%b %Y"), "count": row.count} for row in result]

    return {"timeline": timeline, "period": period}


# ═══════════════════════════════════════════════════════════
#   CSV EXPORT
# ═══════════════════════════════════════════════════════════

@router.get("/export/candidates.csv")
async def export_candidates_csv(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Export all candidates to CSV — matches old app's /api/export/candidates.csv."""
    client_id = current_user["client_id"]

    result = await db.execute(
        select(Candidate).where(
            Candidate.client_id == client_id,
            Candidate.deleted_at.is_(None)
        ).order_by(Candidate.created_at.desc())
    )
    candidates = result.scalars().all()

    if not candidates:
        return {"error": "No candidates found"}

    output = io.StringIO()
    writer = csv.writer(output)

    headers = [
        "ID", "Name", "Email", "Phone", "Location",
        "Current Title", "Current Company", "Years of Experience",
        "Skills", "Education", "Desired Role", "Salary Expectation",
        "Availability", "Source", "Created At"
    ]
    writer.writerow(headers)

    for c in candidates:
        writer.writerow([
            c.id, c.name, c.email, c.phone, c.location,
            c.current_title, c.current_company, c.years_of_experience,
            c.skills, c.education, c.desired_role, c.salary_expectation,
            c.availability, c.source, c.created_at.isoformat() if c.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=candidates.csv"}
    )
