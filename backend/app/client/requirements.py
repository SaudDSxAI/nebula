"""
Requirements Management Routes
Task 4.2: CRUD for job requirements scoped to authenticated client
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, or_
from datetime import datetime
from typing import Dict, Any, Optional, List
import math
import json
import logging

logger = logging.getLogger(__name__)

from app.database import get_db
from app.models.requirement import Requirement
from app.models.candidate import Applicant, Candidate
from app.models.client import ClientUser
from app.models.activity import ActivityLog
from app.schemas.client_portal import (
    RequirementCreateRequest,
    RequirementUpdateRequest,
    RequirementResponse,
    RequirementListResponse,
    AIRequirementCreateRequest,
)
from app.middleware.auth import require_client, require_client_write, require_client_admin
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/client/requirements", tags=["Client Requirements"])


async def log_activity(
    db: AsyncSession,
    user_id: int,
    action: str,
    description: str,
    entity_id: int = None,
):
    """Helper to log activity"""
    activity = ActivityLog(
        user_id=user_id,
        user_type="client",
        action=action,
        entity_type="requirement",
        entity_id=entity_id or user_id,
        description=description,
    )
    db.add(activity)
    await db.commit()


async def get_applicant_count(db: AsyncSession, requirement_id: int) -> int:
    """Get total applicant count for a requirement"""
    result = await db.execute(
        select(func.count(Applicant.id)).where(
            Applicant.requirement_id == requirement_id,
            Applicant.deleted_at.is_(None)
        )
    )
    return result.scalar() or 0


def requirement_to_response(req: Requirement, applicants_count: int = 0) -> RequirementResponse:
    """Convert a Requirement model to response schema"""
    assigned_user_info = None
    if req.assigned_to_user_id:
        # Only access the relationship if it's already loaded (avoid lazy load in async context)
        assigned_user = req.__dict__.get('assigned_user')
        if assigned_user:
            assigned_user_info = {
                "id": assigned_user.id,
                "name": assigned_user.name,
                "email": assigned_user.email,
                "role": assigned_user.role,
            }

    return RequirementResponse(
        id=req.id,
        client_id=req.client_id,
        job_title=req.job_title,
        job_description=req.job_description,
        required_skills=req.required_skills,
        preferred_skills=req.preferred_skills,
        experience_level=req.experience_level,
        location=req.location,
        remote_type=req.remote_type,
        salary_range=req.salary_range,
        status=req.status,
        priority=req.priority,
        positions_count=req.positions_count,
        positions_filled=req.positions_filled,
        deadline=req.deadline,
        applicants_count=applicants_count,
        created_at=req.created_at,
        updated_at=req.updated_at,
        assigned_to_user_id=req.assigned_to_user_id,
        assigned_user=assigned_user_info,
        company_name=req.company_name,
        role_title=req.role_title,
        facilities=req.facilities,
        pay_type=req.pay_type,
        notes=req.notes,
        raw_text=req.raw_text,
        structured_data=req.structured_data,
    )


@router.get("", response_model=RequirementListResponse)
async def list_requirements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    status: Optional[str] = Query(None, pattern="^(open|in_progress|filled|closed)$"),
    priority: Optional[str] = Query(None, pattern="^(low|medium|high|urgent)$"),
    search: Optional[str] = None,
    assigned_to: Optional[str] = None, # 'me' or user_id
    sort_by: str = Query("created_at", pattern="^(created_at|job_title|status|priority)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    List requirements for the authenticated client

    - Supports pagination, filtering by status/priority, search, sorting
    - assigned_to='me' returns only requirements assigned to the current user
    """
    client_id = current_user["client_id"]

    # Base query - only this client's requirements, not deleted
    query = select(Requirement).where(
        Requirement.client_id == client_id,
        Requirement.deleted_at.is_(None)
    )

    # Apply filters
    if status:
        query = query.where(Requirement.status == status)
    if priority:
        query = query.where(Requirement.priority == priority)
    if assigned_to:
        if assigned_to == 'me':
            # Check if user is a client user (team member)
            if current_user.get("user_id"):
                query = query.where(Requirement.assigned_to_user_id == current_user["user_id"])
        elif assigned_to.isdigit():
            query = query.where(Requirement.assigned_to_user_id == int(assigned_to))

    if search:
        search_term = f"%{search}%"
        query = query.where(
            Requirement.job_title.ilike(search_term) |
            Requirement.job_description.ilike(search_term) |
            Requirement.location.ilike(search_term)
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sorting
    sort_column = getattr(Requirement, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    requirements = result.scalars().all()

    # Get applicant counts for each requirement
    items = []
    for req in requirements:
        count = await get_applicant_count(db, req.id)
        items.append(requirement_to_response(req, count))

    return RequirementListResponse(
        requirements=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.post("", response_model=RequirementResponse, status_code=status.HTTP_201_CREATED)
async def create_requirement(
    data: RequirementCreateRequest,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new requirement (job posting)

    - Scoped to the authenticated client
    - Sets initial status to 'open'
    """
    client_id = current_user["client_id"]

    requirement = Requirement(
        client_id=client_id,
        job_title=data.job_title,
        job_description=data.job_description,
        required_skills=data.required_skills,
        preferred_skills=data.preferred_skills,
        experience_level=data.experience_level,
        location=data.location,
        remote_type=data.remote_type,
        salary_range=data.salary_range,
        status="open",
        priority=data.priority,
        positions_count=data.positions_count,
        deadline=data.deadline,
        company_name=data.company_name,
        role_title=data.role_title,
        facilities=data.facilities,
        pay_type=data.pay_type,
        notes=data.notes,
    )

    db.add(requirement)
    await db.commit()
    await db.refresh(requirement)

    await log_activity(
        db, client_id, "requirement_created",
        f"Created requirement: {requirement.job_title}",
        entity_id=requirement.id,
    )

    return requirement_to_response(requirement, 0)


# ========================
# AI-POWERED REQUIREMENT CREATION
# ========================

@router.post("/ai-create", status_code=status.HTTP_201_CREATED)
async def create_requirement_from_ai(
    data: AIRequirementCreateRequest,
    current_user: Dict[str, Any] = Depends(require_client_write),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a requirement from raw text via AI parsing.
    Paste any job description or requirement text and AI extracts structured data.
    """
    from app.services.requirements_ai import parse_requirement_text

    parsed = await parse_requirement_text(data.raw_text)
    if not parsed:
        raise HTTPException(
            status_code=422,
            detail="Could not parse the requirement text. Please try again with more detail."
        )

    client_id = current_user["client_id"]

    # Map AI-parsed fields to model
    title = parsed.get("title") or parsed.get("role") or "General Requirement"
    role = parsed.get("role") or title
    company = parsed.get("company_name") or ""
    loc = parsed.get("location") or None
    experience = parsed.get("experience_required") or None
    priority = parsed.get("priority", "medium")
    if priority not in ("urgent", "high", "medium", "low"):
        priority = "medium"

    # Build salary range
    salary_parts = []
    if parsed.get("salary_min"):
        salary_parts.append(str(parsed["salary_min"]))
    if parsed.get("salary_max"):
        salary_parts.append(str(parsed["salary_max"]))
    salary_range = " - ".join(salary_parts) if salary_parts else None
    if salary_range and parsed.get("salary_currency"):
        salary_range = f"{salary_range} {parsed['salary_currency']}"

    # Build description from parsed data
    description_parts = [parsed.get("description") or data.raw_text[:2000]]
    if parsed.get("note"):
        description_parts.append(f"\nNote: {parsed['note']}")
    description = "\n".join(description_parts)

    # Benefits -> facilities
    benefits = parsed.get("benefits") or []
    facilities = ", ".join(benefits) if isinstance(benefits, list) else str(benefits) if benefits else None

    # Build notes from extra context
    notes_parts = []
    if parsed.get("positions"):
        notes_parts.append(f"Positions needed: {parsed['positions']}")
    if parsed.get("visa_requirement"):
        notes_parts.append(f"Visa: {parsed['visa_requirement']}")
    if parsed.get("certifications"):
        certs = parsed["certifications"]
        notes_parts.append(f"Certifications: {', '.join(certs) if isinstance(certs, list) else certs}")
    if parsed.get("nationality_preference"):
        notes_parts.append(f"Nationality: {parsed['nationality_preference']}")
    if parsed.get("education"):
        notes_parts.append(f"Education: {parsed['education']}")

    # Skills
    skills = parsed.get("skills") or []
    skills_str = ", ".join(skills) if isinstance(skills, list) else str(skills) if skills else None



    # Safely coerce positions to int
    positions_raw = parsed.get("positions")
    try:
        positions_count = int(positions_raw) if positions_raw else 1
    except (ValueError, TypeError):
        positions_count = 1

    # Ensure description is never empty (NOT NULL column)
    description = description.strip() or data.raw_text[:2000]
    if not description:
        description = title

    # Safe remote_type
    remote = (parsed.get("remote_type") or parsed.get("employment_type") or "hybrid")
    if not isinstance(remote, str) or remote.lower() not in ("remote", "hybrid", "onsite"):
        remote = "hybrid"

    requirement = Requirement(
        client_id=client_id,
        job_title=title,
        job_description=description,
        required_skills=skills_str,
        experience_level=experience,
        location=loc,
        remote_type=remote.lower(),
        salary_range=salary_range,
        status="open",
        priority=priority,
        positions_count=positions_count,
        company_name=company,
        role_title=role,
        facilities=facilities,
        pay_type=parsed.get("pay_type"),
        notes="\n".join(notes_parts) if notes_parts else None,
        raw_text=data.raw_text,
        structured_data=json.dumps(parsed),
        created_by_user_id=current_user.get("user_id"),
    )

    db.add(requirement)
    await db.commit()
    await db.refresh(requirement)

    await log_activity(
        db, current_user["user_id"], "requirement_ai_created",
        f"AI-created requirement: {title}",
        entity_id=requirement.id,
    )

    return {
        "success": True,
        "requirement_id": requirement.id,
        "parsed": parsed,
        "message": f"Requirement '{title}' created from AI parsing",
        "requirement": requirement_to_response(requirement, 0).model_dump(),
    }


# ========================
# STATS OVERVIEW
# ========================

@router.get("/stats/overview")
async def requirements_stats_overview(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Get requirements statistics - counts by status, priority, and overdue."""
    client_id = current_user["client_id"]
    base = [Requirement.client_id == client_id, Requirement.deleted_at.is_(None)]

    total = (await db.execute(select(func.count()).where(*base))).scalar() or 0
    open_c = (await db.execute(select(func.count()).where(*base, Requirement.status == "open"))).scalar() or 0
    in_prog = (await db.execute(select(func.count()).where(*base, Requirement.status == "in_progress"))).scalar() or 0
    filled = (await db.execute(select(func.count()).where(*base, Requirement.status == "filled"))).scalar() or 0
    closed = (await db.execute(select(func.count()).where(*base, Requirement.status == "closed"))).scalar() or 0
    urgent = (await db.execute(select(func.count()).where(*base, Requirement.priority == "urgent"))).scalar() or 0
    high = (await db.execute(select(func.count()).where(*base, Requirement.priority == "high"))).scalar() or 0
    medium = (await db.execute(select(func.count()).where(*base, Requirement.priority == "medium"))).scalar() or 0
    low = (await db.execute(select(func.count()).where(*base, Requirement.priority == "low"))).scalar() or 0
    overdue = (await db.execute(
        select(func.count()).where(
            *base,
            Requirement.deadline < datetime.utcnow(),
            Requirement.status.notin_(["filled", "closed"])
        )
    )).scalar() or 0

    return {
        "total": total, "open": open_c, "in_progress": in_prog,
        "filled": filled, "closed": closed,
        "urgent": urgent, "high": high, "medium": medium, "low": low,
        "overdue": overdue,
    }


# ========================
# WORKLOAD OVERVIEW
# ========================

@router.get("/workload/overview")
async def workload_overview(
    current_user: Dict[str, Any] = Depends(require_client_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin workload overview - team members and their assigned requirement counts."""
    client_id = current_user["client_id"]

    users_result = await db.execute(
        select(ClientUser).where(
            ClientUser.client_id == client_id,
            ClientUser.is_active == True,
            ClientUser.deleted_at.is_(None)
        ).order_by(ClientUser.name)
    )
    users = users_result.scalars().all()

    reqs_result = await db.execute(
        select(Requirement).where(
            Requirement.client_id == client_id,
            Requirement.deleted_at.is_(None),
            Requirement.assigned_to_user_id.isnot(None)
        ).order_by(Requirement.created_at.desc())
    )
    reqs = reqs_result.scalars().all()

    by_user: Dict[int, List[dict]] = {}
    for r in reqs:
        by_user.setdefault(r.assigned_to_user_id, []).append({
            "id": r.id, "job_title": r.job_title,
            "company_name": r.company_name, "status": r.status, "priority": r.priority,
        })

    data = []
    for u in users:
        items = by_user.get(u.id, [])
        data.append({
            "user_id": u.id, "name": u.name, "email": u.email,
            "role": u.role, "requirements": items, "count": len(items),
        })

    unassigned = (await db.execute(
        select(func.count()).where(
            Requirement.client_id == client_id,
            Requirement.deleted_at.is_(None),
            Requirement.assigned_to_user_id.is_(None)
        )
    )).scalar() or 0

    return {"members": data, "unassigned_count": unassigned}


# ========================
# FILTER OPTIONS
# ========================

@router.get("/filters/options")
async def requirement_filter_options(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Get dynamic filter options for requirements."""
    client_id = current_user["client_id"]
    base = [Requirement.client_id == client_id, Requirement.deleted_at.is_(None)]
    from sqlalchemy import distinct

    loc_result = await db.execute(
        select(distinct(Requirement.location)).where(
            *base, Requirement.location.isnot(None), Requirement.location != ""
        ).order_by(Requirement.location)
    )
    locations = [r[0] for r in loc_result.all()]

    comp_result = await db.execute(
        select(distinct(Requirement.company_name)).where(
            *base, Requirement.company_name.isnot(None), Requirement.company_name != ""
        ).order_by(Requirement.company_name)
    )
    companies = [r[0] for r in comp_result.all()]

    users_result = await db.execute(
        select(ClientUser).where(
            ClientUser.client_id == client_id, ClientUser.is_active == True,
        ).order_by(ClientUser.name)
    )
    team = [{"id": u.id, "name": u.name, "email": u.email, "role": u.role}
            for u in users_result.scalars().all()]

    return {
        "locations": locations, "companies": companies, "team_members": team,
        "statuses": ["open", "in_progress", "filled", "closed"],
        "priorities": ["urgent", "high", "medium", "low"],
    }


# ========================
# PARAMETERIZED ROUTES (must come after static routes)
# ========================

@router.get("/{requirement_id}", response_model=RequirementResponse)
async def get_requirement(
    requirement_id: int,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific requirement by ID (must belong to authenticated client)
    """
    client_id = current_user["client_id"]

    result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id,
            Requirement.client_id == client_id,
            Requirement.deleted_at.is_(None)
        )
    )
    requirement = result.scalar_one_or_none()

    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    count = await get_applicant_count(db, requirement.id)
    return requirement_to_response(requirement, count)


@router.put("/{requirement_id}", response_model=RequirementResponse)
async def update_requirement(
    requirement_id: int,
    data: RequirementUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a requirement (must belong to authenticated client)
    """
    client_id = current_user["client_id"]

    result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id,
            Requirement.client_id == client_id,
            Requirement.deleted_at.is_(None)
        )
    )
    requirement = result.scalar_one_or_none()

    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)
    changes = []
    for field, value in update_data.items():
        old_value = getattr(requirement, field)
        if old_value != value:
            setattr(requirement, field, value)
            changes.append(f"{field}: {old_value} → {value}")

    if not changes:
        count = await get_applicant_count(db, requirement.id)
        return requirement_to_response(requirement, count)

    requirement.updated_at = datetime.utcnow()

    # If status changed to closed/filled, set closed_at
    if data.status and data.status in ("closed", "filled"):
        requirement.closed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(requirement)

    await log_activity(
        db, client_id, "requirement_updated",
        f"Updated requirement '{requirement.job_title}': {', '.join(changes[:3])}",
        entity_id=requirement.id,
    )

    count = await get_applicant_count(db, requirement.id)
    return requirement_to_response(requirement, count)


@router.delete("/{requirement_id}")
async def delete_requirement(
    requirement_id: int,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Soft delete a requirement (must belong to authenticated client)
    - Keeps all associated candidate data
    - Sets deleted_at timestamp
    """
    client_id = current_user["client_id"]

    result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id,
            Requirement.client_id == client_id,
            Requirement.deleted_at.is_(None)
        )
    )
    requirement = result.scalar_one_or_none()

    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    requirement.deleted_at = datetime.utcnow()
    requirement.status = "closed"
    await db.commit()

    await log_activity(
        db, client_id, "requirement_deleted",
        f"Deleted requirement: {requirement.job_title}",
        entity_id=requirement.id,
    )

    return {"message": f"Requirement '{requirement.job_title}' deleted successfully"}


@router.get("/{requirement_id}/applicants")
async def list_requirement_applicants(
    requirement_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    List applicants for a specific requirement
    """
    client_id = current_user["client_id"]

    # Verify requirement belongs to client
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id,
            Requirement.client_id == client_id,
            Requirement.deleted_at.is_(None)
        )
    )
    requirement = result.scalar_one_or_none()

    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    # Query applicants
    query = select(Applicant).where(
        Applicant.requirement_id == requirement_id,
        Applicant.deleted_at.is_(None)
    )

    if status:
        query = query.where(Applicant.status == status)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.order_by(Applicant.applied_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    applicants = result.scalars().all()

    # Enrich with candidate info
    from app.models.candidate import Candidate
    items = []
    for app in applicants:
        cand_result = await db.execute(
            select(Candidate).where(Candidate.id == app.candidate_id)
        )
        candidate = cand_result.scalar_one_or_none()

        items.append({
            "id": app.id,
            "candidate_id": app.candidate_id,
            "candidate_name": candidate.name if candidate else "Unknown",
            "candidate_email": candidate.email if candidate else "Unknown",
            "status": app.status,
            "ai_match_score": app.ai_match_score,
            "applied_at": app.applied_at.isoformat() if app.applied_at else None,
            "updated_at": app.updated_at.isoformat() if app.updated_at else None,
        })

    return {
        "applicants": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total > 0 else 1,
    }


# ========================
# ASSIGNMENT ENDPOINTS
# ========================

class AssignTeamMemberRequest(BaseModel):
    user_id: int


class AssignCandidateRequest(BaseModel):
    candidate_id: int


class UpdatePipelineStageRequest(BaseModel):
    stage: str = Field(..., pattern="^(applied|screening|shortlisted|interview|offered|accepted|rejected)$")
    note: Optional[str] = None


@router.put("/{requirement_id}/assign-team")
async def assign_to_team_member(
    requirement_id: int,
    data: AssignTeamMemberRequest,
    current_user: Dict[str, Any] = Depends(require_client_admin),
    db: AsyncSession = Depends(get_db),
):
    """Assign a requirement to a team member (admin only)."""
    client_id = current_user["client_id"]

    # Verify requirement
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id, Requirement.client_id == client_id,
            Requirement.deleted_at.is_(None)
        )
    )
    requirement = result.scalar_one_or_none()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Verify team member belongs to same client
    user_result = await db.execute(
        select(ClientUser).where(
            ClientUser.id == data.user_id, ClientUser.client_id == client_id,
            ClientUser.is_active == True, ClientUser.deleted_at.is_(None)
        )
    )
    team_user = user_result.scalar_one_or_none()
    if not team_user:
        raise HTTPException(status_code=404, detail="Team member not found or inactive")

    requirement.assigned_to_user_id = data.user_id
    requirement.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(requirement)

    await log_activity(db, current_user["user_id"], "requirement_assigned",
                       f"Assigned '{requirement.job_title}' to {team_user.name}",
                       entity_id=requirement.id)

    return {"message": f"Requirement assigned to {team_user.name}", "assigned_to": {
        "id": team_user.id, "name": team_user.name, "email": team_user.email
    }}


@router.put("/{requirement_id}/unassign-team")
async def unassign_from_team_member(
    requirement_id: int,
    current_user: Dict[str, Any] = Depends(require_client_admin),
    db: AsyncSession = Depends(get_db),
):
    """Unassign a requirement from its team member (admin only)."""
    client_id = current_user["client_id"]

    result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id, Requirement.client_id == client_id,
            Requirement.deleted_at.is_(None)
        )
    )
    requirement = result.scalar_one_or_none()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")

    requirement.assigned_to_user_id = None
    requirement.updated_at = datetime.utcnow()
    await db.commit()

    return {"message": "Requirement unassigned"}


@router.post("/{requirement_id}/assign-candidate")
async def assign_candidate(
    requirement_id: int,
    data: AssignCandidateRequest,
    current_user: Dict[str, Any] = Depends(require_client_write),
    db: AsyncSession = Depends(get_db),
):
    """
    Assign a candidate to this requirement (exclusive).
    A candidate can only be assigned to ONE active requirement at a time.
    """
    client_id = current_user["client_id"]

    # Verify requirement
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id, Requirement.client_id == client_id,
            Requirement.deleted_at.is_(None)
        )
    )
    requirement = result.scalar_one_or_none()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Verify candidate belongs to client
    cand_result = await db.execute(
        select(Candidate).where(
            Candidate.id == data.candidate_id, Candidate.client_id == client_id,
            Candidate.deleted_at.is_(None)
        )
    )
    candidate = cand_result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Check exclusivity — candidate must not have an active assignment elsewhere
    existing = await db.execute(
        select(Applicant).where(
            Applicant.candidate_id == data.candidate_id,
            Applicant.deleted_at.is_(None),
            Applicant.status.notin_(["rejected", "withdrawn"])
        )
    )
    active_assignment = existing.scalar_one_or_none()
    if active_assignment:
        if active_assignment.requirement_id == requirement_id:
            raise HTTPException(status_code=400, detail="Candidate is already assigned to this requirement.")
        # Get the other requirement title
        other_req = await db.execute(
            select(Requirement.job_title).where(Requirement.id == active_assignment.requirement_id)
        )
        other_title = other_req.scalar() or "another requirement"
        raise HTTPException(
            status_code=409,
            detail=f"Candidate '{candidate.name}' is already assigned to '{other_title}'. Unassign them first."
        )

    # Create assignment
    applicant = Applicant(
        candidate_id=data.candidate_id,
        requirement_id=requirement_id,
        status="screening",
        current_stage="screening",
        application_source="manual_assignment",
    )
    db.add(applicant)
    await db.commit()
    await db.refresh(applicant)

    await log_activity(db, current_user["user_id"], "candidate_assigned",
                       f"Assigned '{candidate.name}' to '{requirement.job_title}'",
                       entity_id=requirement.id)

    return {
        "message": f"Candidate '{candidate.name}' assigned to '{requirement.job_title}'",
        "applicant_id": applicant.id,
        "candidate": {"id": candidate.id, "name": candidate.name, "email": candidate.email},
        "stage": "screening",
    }


@router.delete("/{requirement_id}/unassign-candidate/{candidate_id}")
async def unassign_candidate(
    requirement_id: int,
    candidate_id: int,
    current_user: Dict[str, Any] = Depends(require_client_write),
    db: AsyncSession = Depends(get_db),
):
    """Unassign a candidate from a requirement (soft-delete the applicant record)."""
    client_id = current_user["client_id"]

    # Verify requirement
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id, Requirement.client_id == client_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Find applicant record
    app_result = await db.execute(
        select(Applicant).where(
            Applicant.requirement_id == requirement_id,
            Applicant.candidate_id == candidate_id,
            Applicant.deleted_at.is_(None)
        )
    )
    applicant = app_result.scalar_one_or_none()
    if not applicant:
        raise HTTPException(status_code=404, detail="Assignment not found")

    applicant.status = "withdrawn"
    applicant.deleted_at = datetime.utcnow()
    await db.commit()

    await log_activity(db, current_user["user_id"], "candidate_unassigned",
                       f"Unassigned candidate {candidate_id} from requirement {requirement_id}",
                       entity_id=requirement_id)

    return {"message": "Candidate unassigned successfully"}


@router.put("/{requirement_id}/applicants/{applicant_id}/stage")
async def update_pipeline_stage(
    requirement_id: int,
    applicant_id: int,
    data: UpdatePipelineStageRequest,
    current_user: Dict[str, Any] = Depends(require_client_write),
    db: AsyncSession = Depends(get_db),
):
    """
    Move a candidate through the pipeline.
    Stages: screening → shortlisted → interview → offered → accepted/rejected
    """
    client_id = current_user["client_id"]

    # Verify requirement
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id, Requirement.client_id == client_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Get applicant
    app_result = await db.execute(
        select(Applicant).where(
            Applicant.id == applicant_id,
            Applicant.requirement_id == requirement_id,
            Applicant.deleted_at.is_(None)
        )
    )
    applicant = app_result.scalar_one_or_none()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    old_stage = applicant.current_stage or applicant.status
    applicant.status = data.stage
    applicant.current_stage = data.stage
    applicant.status_changed_at = datetime.utcnow()
    applicant.updated_at = datetime.utcnow()

    if data.note:
        applicant.internal_notes = (applicant.internal_notes or "") + f"\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] Stage: {old_stage} → {data.stage}: {data.note}"

    # Track stage history in interview_stages JSON
    import json
    history = applicant.interview_stages or []
    if isinstance(history, str):
        try:
            history = json.loads(history)
        except:
            history = []
    history.append({
        "from": old_stage,
        "to": data.stage,
        "at": datetime.utcnow().isoformat(),
        "by": current_user["user_id"],
        "note": data.note,
    })
    applicant.interview_stages = history

    # If accepted, increment positions_filled
    if data.stage == "accepted":
        req_result = await db.execute(
            select(Requirement).where(Requirement.id == requirement_id)
        )
        req = req_result.scalar_one()
        req.positions_filled = (req.positions_filled or 0) + 1
        if req.positions_filled >= req.positions_count:
            req.status = "filled"
            req.closed_at = datetime.utcnow()

    await db.commit()

    await log_activity(db, current_user["user_id"], "pipeline_stage_changed",
                       f"Pipeline: {old_stage} → {data.stage} for applicant {applicant_id}",
                       entity_id=requirement_id)

    return {
        "message": f"Stage updated: {old_stage} → {data.stage}",
        "applicant_id": applicant.id,
        "new_stage": data.stage,
        "old_stage": old_stage,
    }


@router.get("/{requirement_id}/pipeline")
async def get_pipeline(
    requirement_id: int,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the pipeline view for a requirement — candidates grouped by stage.
    """
    client_id = current_user["client_id"]

    # Verify requirement
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id, Requirement.client_id == client_id,
            Requirement.deleted_at.is_(None)
        )
    )
    requirement = result.scalar_one_or_none()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Get all applicants for this requirement
    app_result = await db.execute(
        select(Applicant).where(
            Applicant.requirement_id == requirement_id,
            Applicant.deleted_at.is_(None)
        ).order_by(Applicant.updated_at.desc())
    )
    applicants = app_result.scalars().all()

    # Group by stage
    stages = {"screening": [], "shortlisted": [], "interview": [], "offered": [], "accepted": [], "rejected": []}

    for app in applicants:
        cand_result = await db.execute(
            select(Candidate).where(Candidate.id == app.candidate_id)
        )
        candidate = cand_result.scalar_one_or_none()

        stage = app.current_stage or app.status or "screening"
        if stage not in stages:
            stage = "screening"

        import json
        history = []
        if app.interview_stages:
            try:
                history = json.loads(app.interview_stages) if isinstance(app.interview_stages, str) else app.interview_stages
            except:
                history = []

        stages[stage].append({
            "applicant_id": app.id,
            "candidate_id": app.candidate_id,
            "candidate_name": candidate.name if candidate else "Unknown",
            "candidate_email": candidate.email if candidate else "",
            "current_title": candidate.current_title if candidate else None,
            "stage": stage,
            "ai_match_score": app.ai_match_score,
            "applied_at": app.applied_at.isoformat() if app.applied_at else None,
            "updated_at": app.updated_at.isoformat() if app.updated_at else None,
            "notes": app.internal_notes,
            "history": history,
        })

    return {
        "requirement_id": requirement.id,
        "job_title": requirement.job_title,
        "status": requirement.status,
        "positions_count": requirement.positions_count,
        "positions_filled": requirement.positions_filled,
        "stages": stages,
        "total_candidates": sum(len(v) for v in stages.values()),
    }


# ========================
# CANDIDATE MONITORING
# ========================

@router.get("/monitoring/board")
async def get_candidate_monitoring_board(
    requirement_id: Optional[int] = None,
    stage: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all assigned candidates across requirements,
    grouped by pipeline stage, with their requirement and tags.
    Optional filters: requirement_id, stage.
    """
    client_id = current_user["client_id"]

    # Get all active requirements for this client
    req_query = select(Requirement).where(
        Requirement.client_id == client_id,
        Requirement.deleted_at.is_(None),
        Requirement.status.not_in(["closed"]),
    )
    if requirement_id:
        req_query = req_query.where(Requirement.id == requirement_id)
    req_result = await db.execute(req_query)
    requirements = req_result.scalars().all()
    req_map = {r.id: r for r in requirements}

    # Get all applicants for those requirements
    req_ids = [r.id for r in requirements]
    if not req_ids:
        return {"stages": {}, "total": 0, "requirements": []}

    app_query = select(Applicant).where(
        Applicant.requirement_id.in_(req_ids),
        Applicant.deleted_at.is_(None),
        Applicant.status != "withdrawn",
    )
    if stage:
        app_query = app_query.where(Applicant.current_stage == stage)
    app_result = await db.execute(app_query)
    applicants = app_result.scalars().all()

    # Fetch all unique candidate IDs
    cand_ids = list({a.candidate_id for a in applicants})
    if not cand_ids:
        return {"stages": {s: [] for s in ["screening","shortlisted","interview","offered","accepted","rejected"]}, "total": 0, "requirements": []}

    cand_result = await db.execute(
        select(Candidate).where(Candidate.id.in_(cand_ids))
    )
    cand_map = {c.id: c for c in cand_result.scalars().all()}

    STAGES = ["screening", "shortlisted", "interview", "offered", "accepted", "rejected"]
    stage_groups: dict = {s: [] for s in STAGES}
    # also capture null/applied
    stage_groups["applied"] = []

    for app in applicants:
        cand = cand_map.get(app.candidate_id)
        req = req_map.get(app.requirement_id)
        if not cand or not req:
            continue

        # Parse tags from candidate
        try:
            tags = json.loads(cand.tags) if cand.tags else []
        except Exception:
            tags = []

        # Parse skills
        try:
            skills = json.loads(cand.skills) if cand.skills else []
        except Exception:
            skills = []

        card = {
            "applicant_id": app.id,
            "candidate_id": cand.id,
            "candidate_name": cand.name,
            "candidate_email": cand.email,
            "candidate_phone": cand.phone,
            "candidate_location": cand.location,
            "current_title": cand.current_title,
            "years_of_experience": cand.years_of_experience,
            "skills": skills[:5],
            "tags": tags,
            "availability": cand.availability,
            "notice_period": cand.notice_period,
            "requirement_id": req.id,
            "requirement_title": req.job_title,
            "requirement_status": req.status,
            "applicant_status": app.status,
            "stage": app.current_stage or "applied",
            "ai_match_score": app.ai_match_score,
            "internal_notes": app.internal_notes,
            "applied_at": app.applied_at.isoformat() if app.applied_at else None,
            "updated_at": app.updated_at.isoformat() if app.updated_at else None,
        }
        bucket = app.current_stage if app.current_stage in stage_groups else "applied"
        stage_groups[bucket].append(card)

    total = sum(len(v) for v in stage_groups.values())
    req_list = [
        {"id": r.id, "title": r.job_title, "status": r.status}
        for r in requirements
    ]

    return {
        "stages": stage_groups,
        "stage_order": STAGES,
        "total": total,
        "requirements": req_list,
    }


