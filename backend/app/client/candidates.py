"""
Candidate Management Routes
Task 4.3: Search, filter, view, and manage candidates
Enhanced with comprehensive filtering and AI Smart Search
"""
from app.models.cv import CVUpload
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc, asc, cast, Integer, String, distinct
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, validator
import math
import io
import csv
import json
import logging
import os

from app.database import get_db
from app.models.candidate import Candidate, Applicant
from app.models.requirement import Requirement
from app.models.activity import ActivityLog
from app.models.message import Message
from app.schemas.client_portal import (
    CandidateListResponse,
    CandidateResponse,
    CandidateDetailResponse,
    CandidateStatusUpdate,
    CandidateNoteRequest,
)
from app.middleware.auth import require_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/client/candidates", tags=["Client Candidates"])


# ========================
# FILTER REQUEST MODEL
# ========================

class CandidateFilterRequest(BaseModel):
    """Comprehensive filter model inspired by coter_global_agent"""
    # Text search
    search: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None

    # Single-selection filters
    status: Optional[str] = None  # applied, screening, interviewing, etc.
    availability: Optional[str] = None  # immediate, 2_weeks, 1_month, etc.
    experience: Optional[str] = None  # Range: 0-2, 3-5, 6-10, 10+
    source: Optional[str] = None  # direct_application, referral, imported, etc.
    remote_preference: Optional[str] = None  # remote, hybrid, onsite

    # Multi-select filters (arrays)
    location: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    current_title: Optional[List[str]] = None
    education: Optional[List[str]] = None
    work_authorization: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    tags: Optional[List[str]] = None

    # Date range
    dateFrom: Optional[str] = None  # YYYY-MM-DD
    dateTo: Optional[str] = None  # YYYY-MM-DD

    # Requirement filter 
    requirement_id: Optional[int] = None

    # Sorting
    sort_by: str = Field(default="created_at")
    sort_order: str = Field(default="desc")

    # Pagination
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=30, ge=1, le=200)

    @validator('location', 'skills', 'current_title', 'education', 'work_authorization', 'languages', 'tags', pre=True)
    def validate_list_fields(cls, v):
        """Convert single values to list, handle empty arrays"""
        if v is None or v == []:
            return None
        if isinstance(v, str):
            return [v] if v else None
        if isinstance(v, list):
            return [item for item in v if item] if v else None
        return None


class SmartSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)


# ========================
# HELPER FUNCTIONS
# ========================

async def log_activity(
    db: AsyncSession,
    user_id: int,
    action: str,
    description: str,
    entity_id: int = None,
    changes: str = None,
):
    """Helper to log activity"""
    activity = ActivityLog(
        user_id=user_id,
        user_type="client",
        action=action,
        entity_type="candidate",
        entity_id=entity_id or user_id,
        description=description,
        changes=changes,
    )
    db.add(activity)
    await db.commit()


def build_candidate_filters(query, filters: CandidateFilterRequest, client_id: int):
    """Build SQLAlchemy filter conditions from the filter request."""
    conditions = [
        Candidate.client_id == client_id,
        Candidate.deleted_at.is_(None),
    ]

    # General search (name, email, skills, current_title)
    if filters.search:
        search_term = f"%{filters.search}%"
        conditions.append(
            or_(
                Candidate.name.ilike(search_term),
                Candidate.email.ilike(search_term),
                Candidate.skills.ilike(search_term),
                Candidate.current_title.ilike(search_term),
                Candidate.current_company.ilike(search_term),
            )
        )

    # Name search
    if filters.name:
        conditions.append(Candidate.name.ilike(f"%{filters.name}%"))

    # Email search
    if filters.email:
        conditions.append(Candidate.email.ilike(f"%{filters.email}%"))

    # Availability filter
    if filters.availability:
        conditions.append(Candidate.availability.ilike(f"%{filters.availability}%"))

    # Experience range filter
    if filters.experience:
        if filters.experience.endswith('+'):
            try:
                min_exp = int(filters.experience.replace('+', ''))
                conditions.append(Candidate.years_of_experience >= min_exp)
            except ValueError:
                pass
        elif '-' in filters.experience:
            try:
                parts = filters.experience.split('-')
                min_exp, max_exp = int(parts[0]), int(parts[1])
                conditions.append(
                    and_(
                        Candidate.years_of_experience >= min_exp,
                        Candidate.years_of_experience <= max_exp,
                    )
                )
            except (ValueError, IndexError):
                pass

    # Source filter
    if filters.source:
        conditions.append(Candidate.source.ilike(f"%{filters.source}%"))

    # Remote preference filter
    if filters.remote_preference:
        conditions.append(Candidate.remote_preference == filters.remote_preference)

    # Location - multi-select OR logic
    if filters.location and len(filters.location) > 0:
        loc_conditions = [Candidate.location.ilike(f"%{loc}%") for loc in filters.location]
        conditions.append(or_(*loc_conditions))

    # Skills - multi-select OR logic
    if filters.skills and len(filters.skills) > 0:
        skill_conditions = [Candidate.skills.ilike(f"%{skill}%") for skill in filters.skills]
        conditions.append(or_(*skill_conditions))

    # Current Title - multi-select OR logic
    if filters.current_title and len(filters.current_title) > 0:
        title_conditions = [Candidate.current_title.ilike(f"%{t}%") for t in filters.current_title]
        conditions.append(or_(*title_conditions))

    # Education - multi-select OR logic
    if filters.education and len(filters.education) > 0:
        edu_conditions = [Candidate.education.ilike(f"%{e}%") for e in filters.education]
        conditions.append(or_(*edu_conditions))

    # Work Authorization - multi-select OR logic
    if filters.work_authorization and len(filters.work_authorization) > 0:
        wa_conditions = [Candidate.work_authorization.ilike(f"%{wa}%") for wa in filters.work_authorization]
        conditions.append(or_(*wa_conditions))

    # Languages - multi-select OR logic
    if filters.languages and len(filters.languages) > 0:
        lang_conditions = [Candidate.languages.ilike(f"%{lang}%") for lang in filters.languages]
        conditions.append(or_(*lang_conditions))

    # Tags - multi-select OR logic
    if filters.tags and len(filters.tags) > 0:
        tag_conditions = [Candidate.tags.ilike(f"%{tag}%") for tag in filters.tags]
        conditions.append(or_(*tag_conditions))

    # Date range
    if filters.dateFrom:
        try:
            d_from = datetime.strptime(filters.dateFrom, "%Y-%m-%d")
            conditions.append(Candidate.created_at >= d_from)
        except ValueError:
            pass
    if filters.dateTo:
        try:
            d_to = datetime.strptime(filters.dateTo, "%Y-%m-%d") + timedelta(days=1)
            conditions.append(Candidate.created_at < d_to)
        except ValueError:
            pass

    return conditions


# ========================
# LIST CANDIDATES (ENHANCED)
# ========================

@router.post("/filter")
async def filter_candidates(
    filters: CandidateFilterRequest,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Filter candidates with comprehensive multi-dimensional filters.
    POST endpoint for complex filter payloads.
    """
    client_id = current_user["user_id"]

    # Build filter conditions
    conditions = build_candidate_filters(
        select(Candidate), filters, client_id
    )

    # Base query
    base_query = select(Candidate).where(and_(*conditions))

    # Handle requirement filter (join with applicants)
    if filters.requirement_id:
        base_query = base_query.join(Applicant).where(
            Applicant.requirement_id == filters.requirement_id,
            Applicant.deleted_at.is_(None),
        )
        # If status is provided with requirement, filter by applicant status
        if filters.status:
            base_query = base_query.where(Applicant.status == filters.status)
    elif filters.status:
        # Global status filter - check if ANY application has this status
        base_query = base_query.join(Applicant).where(Applicant.status == filters.status)

    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sorting
    sort_map = {
        "created_at": Candidate.created_at,
        "name": Candidate.name,
        "email": Candidate.email,
        "updated_at": Candidate.updated_at,
        "years_of_experience": Candidate.years_of_experience,
        "location": Candidate.location,
    }
    sort_column = sort_map.get(filters.sort_by, Candidate.created_at)
    if filters.sort_order == "asc":
        base_query = base_query.order_by(asc(sort_column))
    else:
        base_query = base_query.order_by(desc(sort_column))

    # Pagination
    offset = (filters.page - 1) * filters.page_size
    base_query = base_query.offset(offset).limit(filters.page_size)

    result = await db.execute(base_query)
    candidates = result.scalars().all()

    # Build response with application info
    candidate_list = []
    for c in candidates:
        # Get latest application for job title
        app_result = await db.execute(
            select(Applicant, Requirement)
            .join(Requirement, Applicant.requirement_id == Requirement.id)
            .where(Applicant.candidate_id == c.id)
            .order_by(Applicant.applied_at.desc())
            .limit(1)
        )
        app_data = app_result.first()
        job_title = app_data[1].job_title if app_data else None
        app_status = app_data[0].status if app_data else None
        ai_score = app_data[0].ai_match_score if app_data else None

        candidate_list.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "location": c.location,
            "current_title": c.current_title,
            "current_company": c.current_company,
            "years_of_experience": c.years_of_experience,
            "skills": c.skills,
            "education": c.education,
            "certifications": c.certifications,
            "availability": c.availability,
            "salary_expectation": c.salary_expectation,
            "source": c.source,
            "remote_preference": c.remote_preference,
            "work_authorization": c.work_authorization,
            "languages": c.languages,
            "tags": c.tags,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "job_title": job_title,
            "status": app_status or "applied",
            "ai_score": ai_score,
        })

    return {
        "candidates": candidate_list,
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "total_pages": math.ceil(total / filters.page_size) if total > 0 else 1,
    }


# ========================
# FILTER OPTIONS (Dynamic)
# ========================

@router.get("/filter-options")
async def get_filter_options(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all available filter options dynamically from the database.
    Powers the frontend dropdown/multi-select filters.
    """
    client_id = current_user["user_id"]

    base_filter = and_(
        Candidate.client_id == client_id,
        Candidate.deleted_at.is_(None),
    )

    # Locations
    loc_result = await db.execute(
        select(distinct(Candidate.location))
        .where(base_filter, Candidate.location.isnot(None), Candidate.location != "")
        .order_by(Candidate.location)
    )
    locations = [row[0] for row in loc_result.all()]

    # Current Titles
    title_result = await db.execute(
        select(distinct(Candidate.current_title))
        .where(base_filter, Candidate.current_title.isnot(None), Candidate.current_title != "")
        .order_by(Candidate.current_title)
    )
    current_titles = [row[0] for row in title_result.all()]

    # Sources
    source_result = await db.execute(
        select(distinct(Candidate.source))
        .where(base_filter, Candidate.source.isnot(None), Candidate.source != "")
        .order_by(Candidate.source)
    )
    sources = [row[0] for row in source_result.all()]

    # Availability options
    avail_result = await db.execute(
        select(distinct(Candidate.availability))
        .where(base_filter, Candidate.availability.isnot(None), Candidate.availability != "")
        .order_by(Candidate.availability)
    )
    availabilities = [row[0] for row in avail_result.all()]

    # Remote preferences
    remote_result = await db.execute(
        select(distinct(Candidate.remote_preference))
        .where(base_filter, Candidate.remote_preference.isnot(None), Candidate.remote_preference != "")
        .order_by(Candidate.remote_preference)
    )
    remote_preferences = [row[0] for row in remote_result.all()]

    # Work Authorization
    wa_result = await db.execute(
        select(distinct(Candidate.work_authorization))
        .where(base_filter, Candidate.work_authorization.isnot(None), Candidate.work_authorization != "")
        .order_by(Candidate.work_authorization)
    )
    work_authorizations = [row[0] for row in wa_result.all()]

    # Extract unique skills from all candidates
    skills_result = await db.execute(
        select(Candidate.skills)
        .where(base_filter, Candidate.skills.isnot(None), Candidate.skills != "")
    )
    all_skills = set()
    for row in skills_result.all():
        if row[0]:
            # Skills might be stored as JSON array or comma-separated
            try:
                parsed = json.loads(row[0])
                if isinstance(parsed, list):
                    all_skills.update(s.strip() for s in parsed if s.strip())
                else:
                    all_skills.update(s.strip() for s in row[0].split(",") if s.strip())
            except (json.JSONDecodeError, TypeError):
                all_skills.update(s.strip() for s in row[0].split(",") if s.strip())
    skills = sorted(all_skills)

    # Experience ranges (generate from data)
    exp_result = await db.execute(
        select(
            func.min(Candidate.years_of_experience),
            func.max(Candidate.years_of_experience),
        ).where(base_filter, Candidate.years_of_experience.isnot(None))
    )
    exp_row = exp_result.first()
    experience_ranges = ["0-2", "3-5", "6-10", "10+"]
    if exp_row and exp_row[0] is not None:
        max_exp = exp_row[1] or 10
        if max_exp > 15:
            experience_ranges = ["0-2", "3-5", "6-10", "11-15", "15+"]
        elif max_exp > 10:
            experience_ranges = ["0-2", "3-5", "6-10", "10+"]

    # Application statuses
    status_result = await db.execute(
        select(distinct(Applicant.status))
        .join(Candidate, Applicant.candidate_id == Candidate.id)
        .where(Candidate.client_id == client_id, Applicant.status.isnot(None))
        .order_by(Applicant.status)
    )
    statuses = [row[0] for row in status_result.all()]

    # Requirements (for requirement filter dropdown)
    req_result = await db.execute(
        select(Requirement.id, Requirement.job_title, Requirement.status)
        .where(Requirement.client_id == client_id)
        .order_by(Requirement.created_at.desc())
    )
    requirements = [
        {"id": row[0], "job_title": row[1], "status": row[2]}
        for row in req_result.all()
    ]

    # Extract unique languages
    lang_result = await db.execute(
        select(Candidate.languages)
        .where(base_filter, Candidate.languages.isnot(None), Candidate.languages != "")
    )
    all_languages = set()
    for row in lang_result.all():
        if row[0]:
            try:
                parsed = json.loads(row[0])
                if isinstance(parsed, list):
                    all_languages.update(l.strip() for l in parsed if l.strip())
                else:
                    all_languages.update(l.strip() for l in row[0].split(",") if l.strip())
            except (json.JSONDecodeError, TypeError):
                all_languages.update(l.strip() for l in row[0].split(",") if l.strip())
    languages = sorted(all_languages)

    # Extract unique tags
    tag_result = await db.execute(
        select(Candidate.tags)
        .where(base_filter, Candidate.tags.isnot(None), Candidate.tags != "")
    )
    all_tags = set()
    for row in tag_result.all():
        if row[0]:
            try:
                parsed = json.loads(row[0])
                if isinstance(parsed, list):
                    all_tags.update(t.strip() for t in parsed if t.strip())
                else:
                    all_tags.update(t.strip() for t in row[0].split(",") if t.strip())
            except (json.JSONDecodeError, TypeError):
                all_tags.update(t.strip() for t in row[0].split(",") if t.strip())
    tags = sorted(all_tags)

    # Total count
    total_result = await db.execute(
        select(func.count()).where(base_filter)
    )
    total = total_result.scalar() or 0

    return {
        "locations": locations,
        "current_titles": current_titles,
        "skills": skills,
        "sources": sources,
        "availabilities": availabilities,
        "remote_preferences": remote_preferences,
        "work_authorizations": work_authorizations,
        "experience_ranges": experience_ranges,
        "statuses": statuses,
        "requirements": requirements,
        "languages": languages,
        "tags": tags,
        "total_candidates": total,
    }


# ========================
# AI SMART SEARCH
# ========================

@router.post("/smart-search")
async def smart_search(
    request: SmartSearchRequest,
    current_user: Dict[str, Any] = Depends(require_client),
):
    """
    Parse natural language search query into structured filters using AI.
    E.g. 'Senior React developers in New York with 5+ years experience'
    → { skills: ['React'], location: ['New York'], experience: '5+' }
    """
    try:
        from openai import OpenAI
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="OpenAI library not installed. Smart search is unavailable."
        )

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY not configured. Smart search is unavailable."
        )

    today_str = datetime.now().strftime("%Y-%m-%d")

    system_prompt = f"""You are an intelligent query optimizer for a recruitment dashboard.
Your job is to take raw, often messy user input, FIX it, and map it to structured JSON filters.

Allowed JSON Keys (and their types):
- "search": string (general keyword search)
- "name": string (candidate name)
- "email": string (candidate email)
- "status": string ("applied", "screening", "interviewing", "offered", "accepted", "rejected")
- "availability": string ("immediate", "2_weeks", "1_month", "3_months")
- "experience": string (ranges: "0-2", "3-5", "6-10", "10+")
- "source": string ("direct_application", "referral", "imported", "linkedin")
- "remote_preference": string ("remote", "hybrid", "onsite")
- "location": list of strings (city/country names, normalized)
- "skills": list of strings (technology/skill names, properly capitalized)
- "current_title": list of strings (job title terms)
- "work_authorization": list of strings ("Citizen", "PR", "Work Visa", "Needs Sponsorship")
- "languages": list of strings
- "tags": list of strings
- "dateFrom": string (YYYY-MM-DD)
- "dateTo": string (YYYY-MM-DD)
- "sort_by": string ("created_at", "name", "years_of_experience")
- "sort_order": string ("asc", "desc")

INTELLIGENCE RULES:
1. FIX TYPOS: "Javscript" -> "JavaScript", "Pyhton" -> "Python", "Recat" -> "React"
2. NORMALIZE SKILLS: Map informal terms to standard ones ("JS" -> "JavaScript", "ML" -> "Machine Learning")
3. NORMALIZE LOCATIONS: "NYC" -> "New York", "SF" -> "San Francisco", "UAE" -> "United Arab Emirates"
4. INFER INTENT: "Looking for senior devs" -> {{"current_title": ["Senior Developer"], "experience": "6-10"}}
5. LOGIC CHECK: Ignore impossible values
6. TODAY'S DATE: {today_str}. Use for "added today", "this week", "last month" etc.

Return ONLY valid JSON. No explanations."""

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.query},
            ],
            temperature=0.2,
            max_tokens=500,
        )

        content = response.choices[0].message.content.strip()

        # Clean markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        filters = json.loads(content.strip())
        return {"filters": filters, "query": request.query}

    except json.JSONDecodeError as e:
        logger.error(f"Smart search JSON parse error: {e}")
        return {"filters": {"search": request.query}, "query": request.query, "fallback": True}
    except Exception as e:
        logger.error(f"Smart search error: {e}")
        return {"filters": {"search": request.query}, "query": request.query, "fallback": True}


# ========================
# ORIGINAL ENDPOINTS (kept)
# ========================

@router.get("", response_model=CandidateListResponse)
async def list_candidates(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    location: Optional[str] = None,
    requirement_id: Optional[int] = None,
    sort_by: str = Query("created_at", pattern="^(created_at|name|updated_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    List Candidates with basic search & filtering (backward compatible GET endpoint).
    For advanced filtering, use POST /filter instead.
    """
    client_id = current_user["user_id"]

    query = select(Candidate).where(
        Candidate.client_id == client_id,
        Candidate.deleted_at.is_(None)
    )

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Candidate.name.ilike(search_term),
                Candidate.email.ilike(search_term),
                Candidate.skills.ilike(search_term),
                Candidate.current_title.ilike(search_term),
            )
        )

    if location:
        query = query.where(Candidate.location.ilike(f"%{location}%"))

    if requirement_id:
        req_check = await db.execute(
            select(Requirement.id).where(
                Requirement.id == requirement_id,
                Requirement.client_id == client_id
            )
        )
        if not req_check.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Requirement not found")

        query = query.join(Applicant).where(
            Applicant.requirement_id == requirement_id,
            Applicant.deleted_at.is_(None)
        )

        if status:
            query = query.where(Applicant.status == status)

    if status and not requirement_id:
        pass

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    sort_column = getattr(Candidate, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    candidates = result.scalars().all()

    return CandidateListResponse(
        candidates=candidates,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.get("/export")
async def export_candidates_csv(
    search: Optional[str] = None,
    requirement_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Export filtered candidates to CSV"""
    client_id = current_user["user_id"]

    query = select(Candidate).where(
        Candidate.client_id == client_id,
        Candidate.deleted_at.is_(None)
    )

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Candidate.name.ilike(search_term),
                Candidate.email.ilike(search_term)
            )
        )

    if requirement_id:
        query = query.join(Applicant).where(Applicant.requirement_id == requirement_id)

    result = await db.execute(query)
    candidates = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "ID", "Name", "Email", "Phone", "Location",
        "Current Title", "Current Company", "Experience (Years)", "Skills",
        "Availability", "Source", "Created At"
    ])

    for c in candidates:
        writer.writerow([
            c.id, c.name, c.email, c.phone or "", c.location or "",
            c.current_title or "", c.current_company or "",
            c.years_of_experience or 0, c.skills or "",
            c.availability or "", c.source or "",
            c.created_at.strftime("%Y-%m-%d") if c.created_at else ""
        ])

    output.seek(0)

    filename = f"candidates_export_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{candidate_id}", response_model=CandidateDetailResponse)
async def get_candidate_detail(
    candidate_id: int,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Get full candidate profile including application history"""
    client_id = current_user["user_id"]

    result = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.client_id == client_id,
            Candidate.deleted_at.is_(None)
        )
    )
    candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    app_result = await db.execute(
        select(Applicant, Requirement)
        .join(Requirement, Applicant.requirement_id == Requirement.id)
        .where(Applicant.candidate_id == candidate_id)
        .order_by(Applicant.applied_at.desc())
    )
    applications_data = []
    import json
    for app, req in app_result:
        history = app.interview_stages or []
        if isinstance(history, str):
            try:
                history = json.loads(history)
            except:
                history = []

        applications_data.append({
            "id": app.id,
            "requirement_id": req.id,
            "job_title": req.job_title,
            "status": app.status,
            "applied_at": app.applied_at,
            "ai_match_score": app.ai_match_score,
            "ai_match_reasons": app.ai_match_reasons,
            "interview_stages": history
        })

    # Get latest CV upload
    cv_result = await db.execute(
        select(CVUpload).where(
            CVUpload.candidate_id == candidate_id,
            CVUpload.deleted_at.is_(None),
            CVUpload.is_latest == True,
        ).order_by(CVUpload.uploaded_at.desc()).limit(1)
    )
    cv_upload = cv_result.scalar_one_or_none()
    cv_url = None
    cv_parsed_text = None
    if cv_upload:
        # Check if this is an R2-stored file (not a local path)
        if cv_upload.storage_path and not cv_upload.storage_path.startswith("uploads/") and not cv_upload.storage_path.startswith("/"):
            # Prefer public URL (permanent, shareable)
            r2_public = os.environ.get("R2_PUBLIC_URL", "")
            if r2_public:
                cv_url = f"{r2_public}/{cv_upload.storage_path}"
            else:
                try:
                    from app.services.r2_storage import generate_presigned_url
                    cv_url = generate_presigned_url(cv_upload.storage_path, expiry_seconds=3600)
                except Exception:
                    cv_url = None
        else:
            base_url = os.environ.get("APP_BASE_URL", "http://localhost:8000")
            cv_url = f"{base_url}/api/cv/{cv_upload.id}/view"
        cv_parsed_text = cv_upload.parsed_text

    base_data = CandidateResponse.model_validate(candidate).model_dump()

    return CandidateDetailResponse(
        **base_data,
        applications=applications_data,
        cv_url=cv_url,
        cv_parsed_text=cv_parsed_text,
    )


@router.delete("/{candidate_id}")
async def delete_candidate(
    candidate_id: int,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a candidate (sets deleted_at). Data is preserved in DB."""
    client_id = current_user["user_id"]

    result = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.client_id == client_id,
            Candidate.deleted_at.is_(None),
        )
    )
    candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate.deleted_at = datetime.utcnow()
    candidate.is_active = False  # deactivates account — prevents login
    await db.commit()

    await log_activity(
        db, client_id,
        action="candidate_deleted",
        description=f"Deleted candidate: {candidate.name}",
        entity_id=candidate_id,
    )

    return {"message": "Candidate deleted successfully"}


@router.put("/{candidate_id}/status")
async def update_candidate_app_status(
    candidate_id: int,
    status_update: CandidateStatusUpdate,
    requirement_id: int = Query(..., description="Requirement ID to update status for"),
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Update candidate status for a specific requirement application"""
    client_id = current_user["user_id"]

    cand_check = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.client_id == client_id
        )
    )
    if not cand_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Candidate not found")

    result = await db.execute(
        select(Applicant).where(
            Applicant.candidate_id == candidate_id,
            Applicant.requirement_id == requirement_id
        )
    )
    applicant = result.scalar_one_or_none()

    if not applicant:
        raise HTTPException(status_code=404, detail="Application not found for this requirement")

    old_status = applicant.status
    applicant.status = status_update.status
    applicant.status_changed_at = datetime.utcnow()

    await db.commit()

    await log_activity(
        db, client_id,
        action="status_updated",
        description=f"Updated candidate status from {old_status} to {status_update.status}",
        entity_id=candidate_id,
        changes=f"requirement_id={requirement_id}"
    )

    if status_update.note:
        await log_activity(
            db, client_id,
            action="note_added",
            description=status_update.note,
            entity_id=candidate_id
        )

    return {"message": "Status updated successfully", "status": applicant.status}


@router.post("/{candidate_id}/notes")
async def add_candidate_note(
    candidate_id: int,
    note: CandidateNoteRequest,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Add a note to a candidate profile"""
    client_id = current_user["user_id"]

    cand_check = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.client_id == client_id
        )
    )
    if not cand_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Candidate not found")

    await log_activity(
        db, client_id,
        action="note_added",
        description=note.content,
        entity_id=candidate_id
    )

    return {"message": "Note added successfully"}


@router.get("/{candidate_id}/notes")
async def get_candidate_notes(
    candidate_id: int,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Get timeline/notes for a candidate"""
    client_id = current_user["user_id"]

    result = await db.execute(
        select(ActivityLog).where(
            ActivityLog.client_id == client_id,
            ActivityLog.entity_type == "candidate",
            ActivityLog.entity_id == candidate_id,
            or_(
                ActivityLog.action == "note_added",
                ActivityLog.action == "status_updated"
            )
        ).order_by(ActivityLog.created_at.desc())
    )

    logs = result.scalars().all()

    return [
        {
            "id": log.id,
            "type": "note" if log.action == "note_added" else "status",
            "content": log.description,
            "created_at": log.created_at,
            "author": "Client User"
        }
        for log in logs
    ]


# ========================
# ADMIN-CANDIDATE MESSAGING
# ========================

class AdminSendMessage(BaseModel):
    message: str


@router.get("/{candidate_id}/messages")
async def get_candidate_messages(
    candidate_id: int,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Get all messages between admin and a candidate."""
    client_id = current_user["user_id"]

    # Verify candidate belongs to client
    cand_check = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.client_id == client_id,
        )
    )
    if not cand_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Candidate not found")

    result = await db.execute(
        select(Message).where(
            Message.candidate_id == candidate_id,
            Message.client_id == client_id,
        ).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    # Mark candidate messages as read
    from sqlalchemy import update as sa_update
    unread_ids = [m.id for m in messages if m.sender_type == "candidate" and not m.is_read]
    if unread_ids:
        await db.execute(
            sa_update(Message).where(Message.id.in_(unread_ids)).values(is_read=True)
        )
        await db.commit()

    return {
        "messages": [{
            "id": m.id,
            "sender_type": m.sender_type,
            "sender_name": m.sender_name,
            "message": m.message,
            "is_read": m.is_read,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        } for m in messages],
        "total": len(messages)
    }


@router.post("/{candidate_id}/messages")
async def send_candidate_message(
    candidate_id: int,
    data: AdminSendMessage,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Send a message from admin to candidate."""
    client_id = current_user["user_id"]

    cand_check = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.client_id == client_id,
        )
    )
    if not cand_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Candidate not found")

    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    msg = Message(
        candidate_id=candidate_id,
        client_id=client_id,
        sender_type="admin",
        sender_id=current_user.get("client_user_id"),
        sender_name=current_user.get("name", "Admin"),
        message=data.message.strip()[:2000],
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    return {
        "message": "Message sent",
        "data": {
            "id": msg.id,
            "sender_type": msg.sender_type,
            "sender_name": msg.sender_name,
            "message": msg.message,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        }
    }


@router.get("/{candidate_id}/messages/unread")
async def candidate_unread_messages(
    candidate_id: int,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Get count of unread messages from a candidate (admin side view)."""
    client_id = current_user["user_id"]

    result = await db.execute(
        select(func.count(Message.id)).where(
            Message.candidate_id == candidate_id,
            Message.client_id == client_id,
            Message.sender_type == "candidate",
            Message.is_read == False,
        )
    )
    count = result.scalar() or 0
    return {"unread_count": count}

