"""
Candidate Portal API Routes
- Account creation (signup with password)
- Login / Logout
- Profile management (update details, CV, preferences)
- Job status tracking
- CV upload & management
- Password management
- Admin-Candidate Messaging
- Email OTP Verification
"""
import os
import uuid
import json
import aiofiles
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sqlfunc, update
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models.client import Client
from app.models.candidate import Candidate, Applicant
from app.models.requirement import Requirement
from app.models.cv import CVUpload
from app.models.message import Message
from app.utils.auth import hash_password, verify_password, create_access_token, verify_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/candidate", tags=["Candidate Portal"])

security = HTTPBearer()

OTP_EXPIRY_MINUTES = 10
OTP_RESEND_COOLDOWN = 60  # seconds

# In-memory OTP store (keyed by candidate_id) — use Redis in production
_otp_store: Dict[int, dict] = {}


# ======================================================
# AUTH DEPENDENCY
# ======================================================

async def require_candidate(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Verify candidate JWT token."""
    payload = verify_token(credentials.credentials, token_type="access")
    if not payload or payload.get("user_type") != "candidate":
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    candidate_id = payload.get("user_id")
    result = await db.execute(
        select(Candidate).where(Candidate.id == candidate_id, Candidate.is_active == True)
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=401, detail="Candidate not found")

    return {
        "candidate_id": candidate.id,
        "client_id": candidate.client_id,
        "email": candidate.email,
        "name": candidate.name,
        "candidate": candidate,
    }


# ======================================================
# SCHEMAS
# ======================================================

class CandidateSignup(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    current_title: Optional[str] = None
    location: Optional[str] = None

class CandidateLogin(BaseModel):
    email: str
    password: str
    client_slug: Optional[str] = None  # Optional: slug is in the URL path

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    years_of_experience: Optional[int] = None
    skills: Optional[str] = None
    desired_role: Optional[str] = None
    desired_location: Optional[str] = None
    remote_preference: Optional[str] = None
    salary_expectation: Optional[str] = None
    availability: Optional[str] = None
    notice_period: Optional[str] = None
    work_authorization: Optional[str] = None
    languages: Optional[str] = None
    tags: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class SendMessage(BaseModel):
    message: str

class VerifyOTP(BaseModel):
    code: str


# ======================================================
# AUTH ENDPOINTS
# ======================================================

@router.post("/{slug}/signup")
async def candidate_signup(
    slug: str,
    data: CandidateSignup,
    db: AsyncSession = Depends(get_db)
):
    """Create a candidate account linked to a client."""
    # Find client
    result = await db.execute(
        select(Client).where(Client.unique_subdomain == slug, Client.status == "active")
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Company not found")

    # Check if email already exists for this client (case-insensitive)
    normalized_email = data.email.lower().strip()
    existing = await db.execute(
        select(Candidate).where(
            Candidate.client_id == client.id,
            sqlfunc.lower(Candidate.email) == normalized_email
        ).order_by(Candidate.is_active.desc(), Candidate.deleted_at.asc().nullsfirst(), Candidate.id.desc())
    )
    existing_candidate = existing.scalars().first()

    if existing_candidate:
        # If account was deleted/deactivated, allow re-registration — reactivate it
        is_deleted = (not existing_candidate.is_active) or (existing_candidate.deleted_at is not None)

        if not is_deleted and existing_candidate.password_hash:
            # Active account with a password already — block duplicate signup
            raise HTTPException(status_code=400, detail="An account with this email already exists. Please login.")

        # Reactivate deleted account OR set password on CV-evaluator-created account
        existing_candidate.password_hash = hash_password(data.password)
        existing_candidate.name = data.name
        if data.phone:
            existing_candidate.phone = data.phone
        if data.current_title:
            existing_candidate.current_title = data.current_title
        if data.location:
            existing_candidate.location = data.location
        existing_candidate.gdpr_consent = True
        existing_candidate.gdpr_consent_date = datetime.utcnow()
        # Reactivate
        existing_candidate.is_active = True
        existing_candidate.deleted_at = None
        await db.commit()
        await db.refresh(existing_candidate)
        candidate = existing_candidate
    else:
        # Create new candidate
        candidate = Candidate(
            client_id=client.id,
            name=data.name.strip(),
            email=data.email.lower().strip(),
            password_hash=hash_password(data.password),
            phone=data.phone,
            current_title=data.current_title,
            location=data.location,
            source="portal_signup",
            gdpr_consent=True,
            gdpr_consent_date=datetime.utcnow(),
        )
        db.add(candidate)
        await db.commit()
        await db.refresh(candidate)

    # Generate token
    token = create_access_token({
        "user_id": candidate.id,
        "user_type": "candidate",
        "email": candidate.email,
        "client_id": client.id,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "candidate": {
            "id": candidate.id,
            "name": candidate.name,
            "email": candidate.email,
            "company_name": client.company_name,
        }
    }


@router.post("/{slug}/login")
async def candidate_login(
    slug: str,
    data: CandidateLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login as candidate."""
    result = await db.execute(
        select(Client).where(Client.unique_subdomain == slug, Client.status == "active")
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Company not found")

    result = await db.execute(
        select(Candidate).where(
            Candidate.client_id == client.id,
            sqlfunc.lower(Candidate.email) == data.email.lower().strip(),
        ).order_by(Candidate.is_active.desc(), Candidate.deleted_at.asc().nullsfirst(), Candidate.id.desc())
    )
    candidate = result.scalars().first()

    # Check if account exists but was deleted
    if candidate and (not candidate.is_active or candidate.deleted_at is not None):
        raise HTTPException(
            status_code=403,
            detail="Your account has been deleted. Please contact the recruitment team if you believe this is an error."
        )

    if not candidate or not candidate.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(data.password, candidate.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({
        "user_id": candidate.id,
        "user_type": "candidate",
        "email": candidate.email,
        "client_id": client.id,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "candidate": {
            "id": candidate.id,
            "name": candidate.name,
            "email": candidate.email,
            "company_name": client.company_name,
        }
    }


# ======================================================
# PROFILE ENDPOINTS
# ======================================================

@router.get("/me")
async def get_profile(
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Get candidate profile."""
    c = current["candidate"]

    # Get client info
    result = await db.execute(select(Client).where(Client.id == c.client_id))
    client = result.scalar_one_or_none()

    return {
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "location": c.location,
        "linkedin_url": c.linkedin_url,
        "portfolio_url": c.portfolio_url,
        "current_title": c.current_title,
        "current_company": c.current_company,
        "years_of_experience": c.years_of_experience,
        "skills": c.skills,
        "education": c.education,
        "certifications": c.certifications,
        "ai_summary": c.ai_summary,
        "desired_role": c.desired_role,
        "desired_location": c.desired_location,
        "remote_preference": c.remote_preference,
        "salary_expectation": c.salary_expectation,
        "availability": c.availability,
        "notice_period": c.notice_period,
        "work_authorization": c.work_authorization,
        "languages": c.languages,
        "tags": c.tags,
        "source": c.source,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        "company_name": client.company_name if client else None,
        "company_slug": client.unique_subdomain if client else None,
    }



@router.put("/me")
async def update_profile(
    data: ProfileUpdate,
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Update candidate profile."""
    c = current["candidate"]
    update_fields = data.model_dump(exclude_unset=True)

    for field, value in update_fields.items():
        setattr(c, field, value)

    c.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(c)

    return {"message": "Profile updated successfully", "status": "success"}


# ======================================================
# PASSWORD MANAGEMENT
# ======================================================

@router.put("/password")
async def change_password(
    data: PasswordChange,
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Change candidate password."""
    c = current["candidate"]

    if not c.password_hash:
        raise HTTPException(status_code=400, detail="No password set. Please contact support.")

    if not verify_password(data.current_password, c.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    c.password_hash = hash_password(data.new_password)
    c.updated_at = datetime.utcnow()
    await db.commit()

    return {"message": "Password changed successfully", "status": "success"}


# ======================================================
# APPLICATIONS / JOB STATUS
# ======================================================

@router.get("/applications")
async def get_applications(
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Get candidate's job applications and their statuses."""
    c = current["candidate"]

    result = await db.execute(
        select(Applicant, Requirement)
        .join(Requirement, Applicant.requirement_id == Requirement.id)
        .where(Applicant.candidate_id == c.id)
        .order_by(Applicant.applied_at.desc())
    )
    rows = result.all()

    applications = []
    for app, req in rows:
        applications.append({
            "id": app.id,
            "requirement": {
                "id": req.id,
                "title": req.job_title,
                "location": req.location,
                "employment_type": req.remote_type,
                "experience_level": req.experience_level,
            },
            "status": app.status,
            "applied_at": app.applied_at.isoformat() if app.applied_at else None,
            "current_stage": app.current_stage,
            "updated_at": app.updated_at.isoformat() if app.updated_at else None,
        })

    return {"applications": applications, "total": len(applications)}


# ======================================================
# OPEN POSITIONS (for this client)
# ======================================================

@router.get("/jobs")
async def get_open_jobs(
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """List open job positions from the client."""
    client_id = current["client_id"]

    result = await db.execute(
        select(Requirement).where(
            Requirement.client_id == client_id,
            Requirement.status == "open",
            Requirement.deleted_at.is_(None)
        ).order_by(Requirement.created_at.desc())
    )
    jobs = result.scalars().all()

    # Check which ones the candidate already applied to
    applied_result = await db.execute(
        select(Applicant.requirement_id).where(
            Applicant.candidate_id == current["candidate_id"]
        )
    )
    applied_ids = set(r[0] for r in applied_result.all())

    return {
        "jobs": [{
            "id": j.id,
            "title": j.job_title,
            "description": j.job_description,
            "location": j.location,
            "employment_type": j.remote_type,
            "experience_level": j.experience_level,
            "salary_range": j.salary_range,
            "skills_required": j.required_skills,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "already_applied": j.id in applied_ids,
        } for j in jobs],
        "total": len(jobs)
    }


@router.post("/jobs/{job_id}/apply")
async def apply_to_job(
    job_id: int,
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Apply to an open position."""
    client_id = current["client_id"]

    # Verify the job exists and belongs to the same client
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == job_id,
            Requirement.client_id == client_id,
            Requirement.status == "open"
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or no longer open")

    # Check if already applied
    existing = await db.execute(
        select(Applicant).where(
            Applicant.candidate_id == current["candidate_id"],
            Applicant.requirement_id == job_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already applied to this job")

    application = Applicant(
        candidate_id=current["candidate_id"],
        requirement_id=job_id,
        status="applied",
        application_source="candidate_portal",
    )
    db.add(application)
    await db.commit()

    return {"message": "Application submitted successfully!", "status": "applied"}


# ======================================================
# CV MANAGEMENT
# ======================================================

@router.get("/cv")
async def get_cv_uploads(
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Get candidate's CV uploads."""
    result = await db.execute(
        select(CVUpload).where(
            CVUpload.candidate_id == current["candidate_id"]
        ).order_by(CVUpload.uploaded_at.desc())
    )
    cvs = result.scalars().all()

    return {
        "cv_uploads": [{
            "id": cv.id,
            "original_filename": cv.original_filename,
            "file_size": cv.file_size,
            "uploaded_at": cv.uploaded_at.isoformat() if cv.uploaded_at else None,
            "parsing_status": cv.parsing_status,
            "storage_path": cv.storage_path,  # R2 object key
        } for cv in cvs],
        "total": len(cvs)
    }


@router.post("/cv/upload")
async def upload_cv(
    file: UploadFile = File(...),
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Upload a new CV. Stores in Cloudflare R2 and parses via AI."""
    from app.services.r2_storage import upload_cv as r2_upload_cv

    allowed = {".pdf", ".docx", ".doc", ".txt"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Invalid file type. Allowed: {', '.join(allowed)}")

    content = await file.read()

    # Get client slug for R2 directory structure
    client_result = await db.execute(select(Client).where(Client.id == current["client_id"]))
    client = client_result.scalar_one_or_none()
    client_slug = client.unique_subdomain if client else str(current["client_id"])

    # Upload to R2
    r2_result = r2_upload_cv(
        file_bytes=content,
        original_filename=file.filename or "cv.pdf",
        client_slug=client_slug,
        candidate_id=current["candidate_id"],
    )

    # Save CV record (storage_path = R2 object key)
    cv = CVUpload(
        candidate_id=current["candidate_id"],
        original_filename=file.filename,
        stored_filename=r2_result["object_key"].split("/")[-1],
        storage_path=r2_result["object_key"],  # R2 object key
        file_size=len(content),
        file_type=ext.lstrip("."),
        parsing_status="processing",
    )
    db.add(cv)
    await db.flush()

    # --- Extract text from CV ---
    cv_text = ""
    try:
        if ext == ".txt":
            cv_text = content.decode("utf-8", errors="ignore")
        elif ext == ".pdf":
            import PyPDF2
            import io
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            cv_text = "\n".join(page.extract_text() or "" for page in reader.pages)
        elif ext in (".docx", ".doc"):
            import docx
            import io
            doc = docx.Document(io.BytesIO(content))
            cv_text = "\n".join(p.text for p in doc.paragraphs)
    except Exception as e:
        logger.warning(f"CV text extraction failed: {e}")
        cv_text = ""

    # --- Parse CV with AI and auto-populate profile ---
    extracted_data = {}
    if cv_text and len(cv_text.strip()) >= 20:
        try:
            from app.services.cv_parser import get_openai_client

            CV_PROFILE_PROMPT = """You are a data extraction system. Extract CV information and return ONLY valid JSON.

RULES:
1. ONLY JSON output - no markdown, no explanation
2. Use exact field names below
3. Missing data = null
4. Follow format specifications exactly

JSON STRUCTURE:
{
  "name": "Full name",
  "email": "Email address",
  "phone": "Phone number",
  "location": "City, Country",
  "current_title": "Current or most recent job title",
  "current_company": "Current or most recent company name",
  "years_of_experience": 5,
  "skills": "comma, separated, skills, list",
  "education": "Degree - University (Year)",
  "certifications": "comma, separated, certifications",
  "linkedin_url": "LinkedIn profile URL if mentioned",
  "portfolio_url": "Personal website or portfolio URL if mentioned",
  "desired_role": "Desired role if mentioned in objective",
  "languages": "comma, separated, languages",
  "work_authorization": "Visa or work authorization status if mentioned",
  "notice_period": "Notice period if mentioned",
  "salary_expectation": "Expected salary if mentioned",
  "remote_preference": "remote, hybrid, or onsite if mentioned",
  "summary": "Brief professional summary (max 200 words)"
}"""

            openai_client = get_openai_client()
            chat_completion = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": CV_PROFILE_PROMPT},
                    {"role": "user", "content": f"CV TEXT:\n{cv_text[:15000]}"}
                ],
                response_format={"type": "json_object"}
            )
            extracted_data = json.loads(chat_completion.choices[0].message.content)
        except Exception as e:
            logger.warning(f"AI CV parsing failed: {e}")
            extracted_data = {}

    # --- Auto-populate candidate profile (only fill empty fields) ---
    if extracted_data:
        candidate = current["candidate"]

        def set_if_empty(field: str, value):
            if value and not getattr(candidate, field, None):
                setattr(candidate, field, value)

        set_if_empty("phone", extracted_data.get("phone"))
        set_if_empty("location", extracted_data.get("location"))
        set_if_empty("current_title", extracted_data.get("current_title"))
        set_if_empty("current_company", extracted_data.get("current_company"))
        set_if_empty("linkedin_url", extracted_data.get("linkedin_url"))
        set_if_empty("portfolio_url", extracted_data.get("portfolio_url"))
        set_if_empty("desired_role", extracted_data.get("desired_role"))
        set_if_empty("salary_expectation", extracted_data.get("salary_expectation"))
        set_if_empty("remote_preference", extracted_data.get("remote_preference"))
        set_if_empty("notice_period", extracted_data.get("notice_period"))
        set_if_empty("work_authorization", extracted_data.get("work_authorization"))
        set_if_empty("ai_summary", extracted_data.get("summary"))

        # Skills, languages — merge comma-separated strings
        if extracted_data.get("skills") and not candidate.skills:
            candidate.skills = extracted_data["skills"]
        if extracted_data.get("languages") and not candidate.languages:
            candidate.languages = extracted_data["languages"]

        # Years of experience
        if extracted_data.get("years_of_experience") and not candidate.years_of_experience:
            try:
                candidate.years_of_experience = int(extracted_data["years_of_experience"])
            except (ValueError, TypeError):
                pass

        # Education & certifications
        if extracted_data.get("education") and not candidate.education:
            candidate.education = extracted_data["education"] if isinstance(extracted_data["education"], str) else json.dumps(extracted_data["education"])
        if extracted_data.get("certifications") and not candidate.certifications:
            candidate.certifications = extracted_data["certifications"] if isinstance(extracted_data["certifications"], str) else json.dumps(extracted_data["certifications"])

        candidate.updated_at = datetime.utcnow()
        cv.parsed_text = cv_text[:10000]
        cv.ai_extracted_data = json.dumps(extracted_data)
        cv.parsing_status = "completed"
        cv.parsed_at = datetime.utcnow()
    else:
        cv.parsing_status = "completed" if cv_text else "failed"
        if cv_text:
            cv.parsed_text = cv_text[:10000]

    await db.commit()
    await db.refresh(cv)

    return {
        "message": "CV uploaded and profile updated successfully!" if extracted_data else "CV uploaded successfully",
        "cv": {
            "id": cv.id,
            "filename": cv.original_filename,
            "size": cv.file_size,
            "parsing_status": cv.parsing_status,
        },
        "profile_updated": bool(extracted_data),
        "extracted_fields": list(k for k, v in extracted_data.items() if v) if extracted_data else [],
    }


@router.get("/cv/{cv_id}/download")
async def download_cv(
    cv_id: int,
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Get a presigned download URL for a CV stored in R2."""
    from app.services.r2_storage import generate_presigned_url

    result = await db.execute(
        select(CVUpload).where(
            CVUpload.id == cv_id,
            CVUpload.candidate_id == current["candidate_id"]
        )
    )
    cv = result.scalar_one_or_none()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    if not cv.storage_path:
        raise HTTPException(status_code=404, detail="File not found in storage")

    # If storage_path looks like a local path (legacy), serve directly
    if cv.storage_path.startswith("uploads/") or cv.storage_path.startswith("/"):
        from fastapi.responses import FileResponse
        if os.path.exists(cv.storage_path):
            return FileResponse(cv.storage_path, filename=cv.original_filename)
        raise HTTPException(status_code=404, detail="Local file not found")

    # R2 path — generate presigned URL (valid 1 hour)
    url = generate_presigned_url(cv.storage_path, expiry_seconds=3600)
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=url)


@router.delete("/cv/{cv_id}")
async def delete_cv(
    cv_id: int,
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Delete a CV upload from R2 and database."""
    from app.services.r2_storage import delete_object

    result = await db.execute(
        select(CVUpload).where(
            CVUpload.id == cv_id,
            CVUpload.candidate_id == current["candidate_id"]
        )
    )
    cv = result.scalar_one_or_none()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    # Delete from R2 (or local for legacy files)
    if cv.storage_path:
        if cv.storage_path.startswith("uploads/") or cv.storage_path.startswith("/"):
            # Legacy local file
            if os.path.exists(cv.storage_path):
                try:
                    os.remove(cv.storage_path)
                except OSError:
                    pass
        else:
            # R2 object key
            delete_object(cv.storage_path)

    # Delete from DB
    await db.delete(cv)
    await db.commit()

    return {"message": "CV deleted successfully"}


# ======================================================
# MESSAGING — Admin  ↔  Candidate
# ======================================================

@router.get("/messages")
async def get_messages(
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Get all messages for the logged-in candidate."""
    candidate_id = current["candidate_id"]
    client_id = current["client_id"]

    result = await db.execute(
        select(Message).where(
            Message.candidate_id == candidate_id,
            Message.client_id == client_id,
        ).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    # Mark admin messages as read
    unread_ids = [m.id for m in messages if m.sender_type == "admin" and not m.is_read]
    if unread_ids:
        await db.execute(
            update(Message).where(Message.id.in_(unread_ids)).values(is_read=True)
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


@router.post("/messages")
async def send_message(
    data: SendMessage,
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Send a message from candidate to admin."""
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    msg = Message(
        candidate_id=current["candidate_id"],
        client_id=current["client_id"],
        sender_type="candidate",
        sender_id=current["candidate_id"],
        sender_name=current["name"],
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


@router.get("/messages/unread")
async def unread_count(
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Get count of unread messages from admin."""
    result = await db.execute(
        select(func.count(Message.id)).where(
            Message.candidate_id == current["candidate_id"],
            Message.client_id == current["client_id"],
            Message.sender_type == "admin",
            Message.is_read == False,
        )
    )
    count = result.scalar() or 0
    return {"unread_count": count}


# ======================================================
# EMAIL OTP VERIFICATION
# ======================================================

@router.post("/otp/send")
async def send_otp(
    current: Dict[str, Any] = Depends(require_candidate),
):
    """Send OTP verification code to candidate email."""
    candidate_id = current["candidate_id"]
    email = current["email"]

    # Check cooldown
    existing = _otp_store.get(candidate_id)
    if existing:
        elapsed = (datetime.utcnow() - existing["sent_at"]).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN:
            remaining = int(OTP_RESEND_COOLDOWN - elapsed)
            raise HTTPException(status_code=429, detail=f"Please wait {remaining}s before resending")

    # Generate OTP
    from app.services.email_service import generate_otp, send_verification_otp
    otp_code = generate_otp()

    # Store OTP
    _otp_store[candidate_id] = {
        "code": otp_code,
        "sent_at": datetime.utcnow(),
        "attempts": 0,
    }

    # Send email
    await send_verification_otp(email, otp_code, current["name"])

    return {"message": "Verification code sent to your email", "email_hint": email[:3] + "***"}


@router.post("/otp/verify")
async def verify_otp_code(
    data: VerifyOTP,
    current: Dict[str, Any] = Depends(require_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Verify the OTP code."""
    candidate_id = current["candidate_id"]

    stored = _otp_store.get(candidate_id)
    if not stored:
        raise HTTPException(status_code=400, detail="No verification code was sent. Please request a new one.")

    # Check expiry
    elapsed = (datetime.utcnow() - stored["sent_at"]).total_seconds()
    if elapsed > OTP_EXPIRY_MINUTES * 60:
        del _otp_store[candidate_id]
        raise HTTPException(status_code=400, detail="Verification code expired. Please request a new one.")

    # Check attempts
    stored["attempts"] += 1
    if stored["attempts"] > 5:
        del _otp_store[candidate_id]
        raise HTTPException(status_code=400, detail="Too many incorrect attempts. Please request a new code.")

    # Verify
    if data.code.strip() != stored["code"]:
        remaining = 5 - stored["attempts"]
        raise HTTPException(status_code=400, detail=f"Invalid code. {remaining} attempt(s) remaining.")

    # Success — mark email as verified
    del _otp_store[candidate_id]

    # Could set a verified flag on candidate if needed
    c = current["candidate"]
    c.gdpr_consent = True
    c.gdpr_consent_date = datetime.utcnow()
    c.updated_at = datetime.utcnow()
    await db.commit()

    return {"message": "Email verified successfully!", "verified": True}
