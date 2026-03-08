"""
AI Integration Routes
Phase 8: Client-facing AI endpoints for matching, scoring, and generation
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any, Optional
from pydantic import BaseModel
import logging
import json

from app.database import get_db
from app.middleware.auth import require_client
from app.services.ai_service import (
    score_candidate_for_job,
    score_all_candidates_for_job,
    generate_job_description,
    generate_candidate_summary,
    ask_cv_question,
)
from app.models.candidate import Candidate, Applicant
from app.models.requirement import Requirement

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/client/ai", tags=["AI Integration"])


# ========================
# SCHEMAS
# ========================

class MatchScoreRequest(BaseModel):
    candidate_id: int
    requirement_id: int

class BatchMatchRequest(BaseModel):
    requirement_id: int

class GenerateJDRequest(BaseModel):
    job_title: str
    required_skills: Optional[str] = None
    experience_level: Optional[str] = None
    location: Optional[str] = None
    remote_type: str = "hybrid"
    notes: Optional[str] = None

class SummaryCandidateRequest(BaseModel):
    candidate_id: int


class AskCvRequest(BaseModel):
    candidate_id: int
    question: str


# ========================
# ENDPOINTS
# ========================

@router.post("/match-score")
async def ai_match_score(
    request: MatchScoreRequest,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Score a candidate against a job requirement using AI.
    Returns a match score (0-100), grade, reasons, and gaps.
    """
    # Verify candidate belongs to this client
    stmt = select(Candidate).where(
        Candidate.id == request.candidate_id,
        Candidate.client_id == current_user["client_id"]
    )
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Verify requirement belongs to this client
    stmt = select(Requirement).where(
        Requirement.id == request.requirement_id,
        Requirement.client_id == current_user["client_id"]
    )
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Requirement not found")

    score_result = await score_candidate_for_job(
        candidate_id=request.candidate_id,
        requirement_id=request.requirement_id,
    )

    if not score_result.get("success"):
        raise HTTPException(status_code=500, detail=score_result.get("error", "AI scoring failed"))

    return score_result


@router.post("/match-all")
async def ai_match_all_candidates(
    request: BatchMatchRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Score ALL candidates who applied for a specific job requirement.
    Runs in background to avoid timeout.
    """
    # Verify requirement belongs to this client
    stmt = select(Requirement).where(
        Requirement.id == request.requirement_id,
        Requirement.client_id == current_user["client_id"]
    )
    result = await db.execute(stmt)
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Count applicants
    stmt = select(Applicant).where(Applicant.requirement_id == request.requirement_id)
    result = await db.execute(stmt)
    applicants = result.scalars().all()
    count = len(applicants)

    if count == 0:
        return {"message": "No applicants to score", "total": 0}

    # Run in background
    background_tasks.add_task(score_all_candidates_for_job, request.requirement_id)

    return {
        "message": f"AI scoring started for {count} applicant(s). Results will be available shortly.",
        "total_applicants": count,
        "requirement_id": request.requirement_id,
        "status": "processing"
    }


@router.post("/generate-jd")
async def ai_generate_job_description(
    request: GenerateJDRequest,
    current_user: Dict[str, Any] = Depends(require_client),
):
    """
    Generate a professional job description using AI.
    """
    result = await generate_job_description(
        job_title=request.job_title,
        required_skills=request.required_skills or "",
        experience_level=request.experience_level or "",
        location=request.location or "",
        remote_type=request.remote_type,
        notes=request.notes or "",
    )

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))

    return result


@router.post("/candidate-summary")
async def ai_generate_candidate_summary(
    request: SummaryCandidateRequest,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate an AI summary for a candidate profile.
    """
    # Verify candidate belongs to this client
    stmt = select(Candidate).where(
        Candidate.id == request.candidate_id,
        Candidate.client_id == current_user["client_id"]
    )
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Candidate not found")

    result = await generate_candidate_summary(request.candidate_id)

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Summary generation failed"))

    return result


@router.get("/match-details/{candidate_id}")
async def get_match_details(
    candidate_id: int,
    requirement_id: int = Query(...),
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed AI match data for a specific candidate-job pair.
    """
    stmt = select(Applicant).where(
        Applicant.candidate_id == candidate_id,
        Applicant.requirement_id == requirement_id,
    )
    result = await db.execute(stmt)
    applicant = result.scalar_one_or_none()

    if not applicant:
        raise HTTPException(status_code=404, detail="Application not found")

    match_data = {}
    if applicant.ai_match_reasons:
        try:
            match_data = json.loads(applicant.ai_match_reasons)
        except json.JSONDecodeError:
            match_data = {"raw": applicant.ai_match_reasons}

    return {
        "candidate_id": candidate_id,
        "requirement_id": requirement_id,
        "ai_match_score": applicant.ai_match_score,
        "score": match_data.get("score"),
        "grade": match_data.get("grade"),
        "reasons": match_data.get("reasons", []),
        "gaps": match_data.get("gaps", []),
        "recommendation": match_data.get("recommendation", ""),
    }


@router.post("/ask-cv")
async def ai_ask_cv(
    request: AskCvRequest,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Ask an AI question about a candidate's CV content.
    """
    stmt = select(Candidate).where(
        Candidate.id == request.candidate_id,
        Candidate.client_id == current_user["client_id"]
    )
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Candidate not found")

    result = await ask_cv_question(
        candidate_id=request.candidate_id,
        question=request.question,
    )

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "AI Q&A failed"))

    return {"answer": result["answer"]}
