"""
Public Portal Routes - Candidate-facing endpoints for client unique links
Includes: Client info by slug, AI Assistant chat, CV Evaluator chat
"""
import json
import uuid
import os
import aiofiles
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models.client import Client, ClientSettings
from app.models.candidate import Candidate, Applicant
from app.models.activity import ActivityLog
from app.models.cv import CVUpload
import logging

logger = logging.getLogger(__name__)
from app.services.cv_evaluator import CVEvalState, CVEvaluatorProcessor
from app.services.company_assistant import (
    AssistantState, AssistantInstance, build_assistant
)

router = APIRouter(prefix="/api/portal", tags=["Public Portal"])


# ======================================================
# IN-MEMORY SESSION STORE (use Redis in production)
# ======================================================
_cv_sessions: Dict[str, CVEvalState] = {}
_cv_file_info: Dict[str, dict] = {}   # session_id → {cv_bytes, cv_file_path, original_filename, client_slug, cv_text}
_assistant_sessions: Dict[str, AssistantState] = {}
# Tracks the DB timestamp key for each client's currently-built assistant
_assistant_build_keys: Dict[int, str] = {}


# ======================================================
# SCHEMAS
# ======================================================

class PublicClientInfo(BaseModel):
    """Public-facing client info (no sensitive data)"""
    id: int
    company_name: str
    slug: str
    logo_url: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    company_description: Optional[str] = None
    industry: Optional[str] = None
    team_size: Optional[str] = None
    headquarters: Optional[str] = None
    benefits: Optional[str] = None
    # Portal customisation
    portal_headline: Optional[str] = None
    portal_tagline: Optional[str] = None
    portal_contact_email: Optional[str] = None
    # Portal stats
    portal_stat1_num: Optional[str] = '500+'
    portal_stat1_label: Optional[str] = 'PLACEMENTS'
    portal_stat2_num: Optional[str] = 'AI'
    portal_stat2_label: Optional[str] = 'POWERED'
    portal_stat3_num: Optional[str] = '24/7'
    portal_stat3_label: Optional[str] = 'ACCESS'
    # Logo adjustments
    logo_scale: Optional[str] = '1'
    logo_offset_x: Optional[int] = 0
    logo_offset_y: Optional[int] = 0
    primary_color: Optional[str] = "#6366f1"
    secondary_color: Optional[str] = "#10b981"
    ai_assistant_enabled: bool = True
    cv_evaluator_enabled: bool = True


class ChatMessage(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    session_id: str
    response: str
    status: str
    missing_fields: Optional[List[dict]] = None
    candidate_data: Optional[dict] = None


class FieldsSubmit(BaseModel):
    session_id: str
    fields: Dict[str, str]


class CandidateRegister(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None


# ======================================================
# HELPERS
# ======================================================

async def get_client_by_slug(slug: str, db: AsyncSession) -> Client:
    """Get active client by slug, raise 404 if not found."""
    result = await db.execute(
        select(Client).where(
            Client.unique_subdomain == slug,
            Client.status == "active",
            Client.deleted_at.is_(None)
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Company not found")
    return client


def build_company_text(client: Client) -> str:
    """Build combined company text for RAG — must match company.py._build_company_text."""
    parts = []
    if client.company_name:
        parts.append(f"Company: {client.company_name}")
    if client.company_description:
        parts.append(client.company_description)
    if client.company_data and client.company_data != client.company_description:
        parts.append(client.company_data)
    if client.industry:
        parts.append(f"Industry: {client.industry}")
    if client.headquarters:
        parts.append(f"Headquarters: {client.headquarters}")
    if client.benefits:
        parts.append(f"Benefits: {client.benefits}")
    if client.team_size:
        parts.append(f"Team Size: {client.team_size}")
    if client.website:
        parts.append(f"Website: {client.website}")
    return "\n\n".join(parts)


# ======================================================
# CLIENT INFO ENDPOINT
# ======================================================

@router.get("/{slug}", response_model=PublicClientInfo)
async def get_portal_info(slug: str, db: AsyncSession = Depends(get_db)):
    """Get public client info by slug. Entry point for candidate landing page."""
    client = await get_client_by_slug(slug, db)

    result = await db.execute(
        select(ClientSettings).where(ClientSettings.client_id == client.id)
    )
    settings = result.scalar_one_or_none()

    return PublicClientInfo(
        id=client.id,
        company_name=client.company_name,
        slug=client.unique_subdomain,
        logo_url=client.logo_url,
        website=client.website,
        phone=client.phone,
        company_description=client.company_description,
        industry=client.industry,
        team_size=client.team_size,
        headquarters=client.headquarters,
        benefits=client.benefits,
        portal_headline=client.portal_headline,
        portal_tagline=client.portal_tagline,
        portal_contact_email=client.portal_contact_email,
        portal_stat1_num=client.portal_stat1_num or '500+',
        portal_stat1_label=client.portal_stat1_label or 'PLACEMENTS',
        portal_stat2_num=client.portal_stat2_num or 'AI',
        portal_stat2_label=client.portal_stat2_label or 'POWERED',
        portal_stat3_num=client.portal_stat3_num or '24/7',
        portal_stat3_label=client.portal_stat3_label or 'ACCESS',
        logo_scale=client.logo_scale or '1',
        logo_offset_x=client.logo_offset_x or 0,
        logo_offset_y=client.logo_offset_y or 0,
        primary_color=settings.primary_color if settings else "#6366f1",
        secondary_color=settings.secondary_color if settings else "#10b981",
        ai_assistant_enabled=settings.ai_assistant_enabled if settings else True,
        cv_evaluator_enabled=settings.cv_parsing_enabled if settings else True,
    )


# ======================================================
# AI ASSISTANT ENDPOINTS
# ======================================================

@router.post("/{slug}/assistant/message", response_model=ChatResponse)
async def assistant_message(
    slug: str,
    msg: ChatMessage,
    db: AsyncSession = Depends(get_db)
):
    """Send message to AI company assistant."""
    from fastapi import Request
    client = await get_client_by_slug(slug, db)

    # Load settings (custom prompt)
    settings_result = await db.execute(select(ClientSettings).where(ClientSettings.client_id == client.id))
    settings = settings_result.scalar_one_or_none()
    custom_prompt = settings.custom_ai_instructions if settings else None
    company_text  = build_company_text(client)

    # Build a key from DB timestamps — changes on every save automatically
    build_key = f"{client.updated_at}|{settings.updated_at if settings else ''}"

    # ── EXACT PATTERN FROM coter-global-agent ──
    # Store the built assistant on request.app.state.assistants[client_id].
    # When the key changes, replace the whole AssistantInstance with a fresh one.
    # This is shared across ALL requests in the same process — no cross-module issues.
    if not hasattr(msg, '_request'):
        pass  # request object handled below

    # Access app state; initialise dict if first boot
    if not hasattr(db.bind, 'app'):  # fallback path
        assistants_dict = _assistant_sessions  # shouldn't happen
    
    # Get the app from the router — use a module-level app ref
    from app.main import app as _app
    if not hasattr(_app.state, 'assistants'):
        _app.state.assistants = {}
    if not hasattr(_app.state, 'assistant_keys'):
        _app.state.assistant_keys = {}

    # Rebuild if key changed (data was updated) or not yet built
    cached_key = _app.state.assistant_keys.get(client.id)
    if cached_key != build_key or client.id not in _app.state.assistants:
        logger.info(f"[assistant] Rebuilding for client {client.id} | key={build_key[:40]}")
        instance = await build_assistant(
            company_name=client.company_name,
            company_text=company_text,
            custom_prompt=custom_prompt,
            client_id=client.id,
            build_key=build_key,
        )
        _app.state.assistants[client.id] = instance
        _app.state.assistant_keys[client.id] = build_key
        logger.info(f"[assistant] Done — {instance.store.size} chunks")
    else:
        instance: AssistantInstance = _app.state.assistants[client.id]
        logger.debug(f"[assistant] Cache HIT for client {client.id}")

    # Conversation session state
    if msg.session_id not in _assistant_sessions:
        _assistant_sessions[msg.session_id] = AssistantState()
    state = _assistant_sessions[msg.session_id]

    try:
        answer = await instance.answer(msg.message, state.messages)
        state.add_message("user", msg.message)
        state.add_message("assistant", answer)
        return ChatResponse(
            session_id=msg.session_id,
            response=answer,
            status="success"
        )
    except Exception as e:
        logger.error(f"Assistant error for client {client.id}: {e}")
        return ChatResponse(
            session_id=msg.session_id,
            response="Sorry, I encountered an error. Please try again.",
            status="error"
        )


# ======================================================
# CV EVALUATOR ENDPOINTS
# ======================================================

@router.post("/{slug}/cv/message", response_model=ChatResponse)
async def cv_message(
    slug: str,
    msg: ChatMessage,
    db: AsyncSession = Depends(get_db)
):
    """Send text/paste CV to evaluator."""
    client = await get_client_by_slug(slug, db)

    # Load client-specific evaluator prompt
    from sqlalchemy import select as sa_select
    from app.models.client import ClientSettings as CS
    settings_row = await db.execute(sa_select(CS).where(CS.client_id == client.id))
    settings_obj = settings_row.scalars().first()
    custom_eval_prompt = settings_obj.evaluator_prompt if settings_obj else None

    if msg.session_id not in _cv_sessions:
        _cv_sessions[msg.session_id] = CVEvalState()
    state = _cv_sessions[msg.session_id]

    try:
        result = await CVEvaluatorProcessor.process(state, msg.message, custom_evaluator_prompt=custom_eval_prompt)
        response = ChatResponse(
            session_id=msg.session_id,
            response=result["response"],
            status=result["status"],
            missing_fields=result.get("missing_fields"),
        )

        # If complete, save candidate to this client's database
        if result.get("candidate_data"):
            await _save_candidate(client.id, result["candidate_data"], db)
            response.candidate_data = result["candidate_data"]

        return response
    except Exception as e:
        return ChatResponse(
            session_id=msg.session_id,
            response="Sorry, I encountered an error processing your CV. Please try again.",
            status="error"
        )


@router.post("/{slug}/cv/upload", response_model=ChatResponse)
async def cv_upload(
    slug: str,
    session_id: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload CV file for evaluation."""
    client = await get_client_by_slug(slug, db)

    # Validate file
    allowed = {".pdf", ".docx", ".doc", ".txt"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Invalid file type. Allowed: {', '.join(allowed)}")

    # Save temp file
    upload_dir = "uploads/portal_cvs"
    os.makedirs(upload_dir, exist_ok=True)
    temp_path = os.path.join(upload_dir, f"{uuid.uuid4()}{ext}")

    async with aiofiles.open(temp_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    # Extract text
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
    except Exception:
        cv_text = ""

    if not cv_text or len(cv_text.strip()) < 20:
        return ChatResponse(
            session_id=session_id,
            response="Could not read the CV file. Please upload a text-based PDF, DOCX, or TXT file.",
            status="error"
        )

    # Upload to Cloudflare R2 happens inside _save_candidate once we have the real candidate ID.
    # We just pass the raw bytes and metadata through.
    r2_object_key = None

    # Load client-specific evaluator prompt
    from sqlalchemy import select as sa_select
    from app.models.client import ClientSettings as CS
    settings_row2 = await db.execute(sa_select(CS).where(CS.client_id == client.id))
    settings_obj2 = settings_row2.scalars().first()
    custom_eval_prompt2 = settings_obj2.evaluator_prompt if settings_obj2 else None

    # Process through evaluator
    if session_id not in _cv_sessions:
        _cv_sessions[session_id] = CVEvalState()
    state = _cv_sessions[session_id]

    result = await CVEvaluatorProcessor.process(state, cv_text, is_file_upload=True, custom_evaluator_prompt=custom_eval_prompt2)
    response = ChatResponse(
        session_id=session_id,
        response=result["response"],
        status=result["status"],
        missing_fields=result.get("missing_fields"),
    )

    if result.get("candidate_data"):
        await _save_candidate(
            client.id, result["candidate_data"], db,
            cv_file_path=temp_path, cv_text=cv_text,
            original_filename=file.filename,
            r2_object_key=r2_object_key,
            client_slug=client.unique_subdomain,
            cv_bytes=content,
        )
        response.candidate_data = result["candidate_data"]
        # Clean up session file info
        _cv_file_info.pop(session_id, None)
    elif result.get("status") in ("needs_fields", "awaiting_fields"):
        # Store file info so submit-fields can use it later
        _cv_file_info[session_id] = {
            "cv_bytes": content,
            "cv_file_path": temp_path,
            "original_filename": file.filename,
            "client_slug": client.unique_subdomain,
            "cv_text": cv_text,
        }

    return response


@router.post("/{slug}/cv/submit-fields", response_model=ChatResponse)
async def cv_submit_fields(
    slug: str,
    submit: FieldsSubmit,
    db: AsyncSession = Depends(get_db)
):
    """Submit missing fields from dynamic form."""
    client = await get_client_by_slug(slug, db)

    if submit.session_id not in _cv_sessions:
        return ChatResponse(
            session_id=submit.session_id,
            response="⚠️ No CV session found. Please upload your CV first.",
            status="error"
        )

    state = _cv_sessions[submit.session_id]
    result = await CVEvaluatorProcessor.submit_fields(state, submit.fields)

    response = ChatResponse(
        session_id=submit.session_id,
        response=result["response"],
        status=result["status"],
    )

    if result.get("candidate_data"):
        # Retrieve file info stored during cv/upload
        fi = _cv_file_info.pop(submit.session_id, {})
        await _save_candidate(
            client.id, result["candidate_data"], db,
            cv_file_path=fi.get("cv_file_path"),
            cv_text=fi.get("cv_text"),
            original_filename=fi.get("original_filename"),
            r2_object_key=None,
            client_slug=fi.get("client_slug") or client.unique_subdomain,
            cv_bytes=fi.get("cv_bytes"),
        )
        response.candidate_data = result["candidate_data"]

    return response


# ======================================================
# CANDIDATE REGISTRATION
# ======================================================

@router.post("/{slug}/register")
async def register_candidate(
    slug: str,
    data: CandidateRegister,
    db: AsyncSession = Depends(get_db)
):
    """Register a new candidate directly with this client."""
    client = await get_client_by_slug(slug, db)

    # Check duplicate
    existing = await db.execute(
        select(Candidate).where(
            Candidate.client_id == client.id,
            Candidate.email == data.email
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "You're already registered!", "status": "exists"}

    candidate = Candidate(
        client_id=client.id,
        name=data.name,
        email=data.email,
        phone=data.phone,
        source="portal_registration",
    )
    db.add(candidate)
    await db.commit()

    return {"message": "Registration successful! The team will be in touch.", "status": "created"}


# ======================================================
# INTERNAL HELPERS
# ======================================================

def _to_str(val) -> Optional[str]:
    """Convert list or value to a comma-separated string for DB storage."""
    if val is None:
        return None
    if isinstance(val, list):
        return ", ".join(str(v) for v in val if v)
    return str(val)


async def _save_candidate(client_id: int, candidate_data: dict, db: AsyncSession,
                         cv_file_path: str = None, cv_text: str = None,
                         original_filename: str = None,
                         r2_object_key: str = None,
                         client_slug: str = None,
                         cv_bytes: bytes = None):
    """Save evaluated candidate to database, scoped to client."""
    def get(*keys):
        for k in keys:
            v = candidate_data.get(k)
            if v:
                return _to_str(v)
        return None

    # ── Core ─────────────────────────────────────────────────────────────────
    name  = get("name", "Name", "full_name", "Full Name") or "Unknown"
    email = get("email", "Email", "E-mail")
    if not email:
        logger.warning(f"CV Evaluator: No email found for {name}. Skipping save.")
        return
    email = email.strip().lower()

    # ── All column mappings ───────────────────────────────────────────────────
    phone             = get("phone", "Phone", "Phone Number", "Contact Number", "Mobile")
    age_raw           = get("age", "Age")
    age               = _parse_years(age_raw)
    gender            = get("gender", "Gender")
    nationality       = get("nationality", "Nationality")
    location          = get("location", "Location", "Current Location", "current_location")
    linkedin_url      = get("linkedin", "LinkedIn", "LinkedIn Profile URL", "linkedin_url")
    portfolio_url     = get("portfolio", "Portfolio", "Portfolio / Website", "portfolio_url")
    title             = get("current_title", "JobTitle", "job_title", "Role/Position", "role", "position", "Role")
    exp_years         = _parse_years(get("experience", "Experience", "total_experience", "Total Experience", "years_of_experience"))
    employment_status = get("employment_status", "EmploymentStatus", "Employment Status")
    notice_period     = get("notice_period", "NoticePeriod", "Notice Period", "When can you start?", "availability", "Availability")
    salary            = get("salary", "Salary", "salary_expectation", "Current / Previous Salary", "Salary Expectation")
    remote_pref       = get("remote_preference", "RemotePref", "Work Preference", "remote_pref")
    visa              = get("visa_status", "VisaStatus", "Visa Status", "Visa / Work Permit Status", "work_authorization")
    willing_reloc     = get("willing_to_relocate", "WillingToReloc", "Willing to Relocate?")
    qualification     = get("qualification", "Qualification", "Highest Qualification", "education")
    certifications    = get("certifications", "Certifications", "Professional Certifications")
    languages         = get("languages", "Languages", "Languages Spoken")
    skills            = get("skills", "Skills")

    # ── extra_data: anything not mapped above ────────────────────────────────
    KNOWN_KEYS = {
        "name","Name","full_name","Full Name",
        "email","Email","E-mail",
        "phone","Phone","Phone Number","Contact Number","Mobile",
        "age","Age","gender","Gender",
        "nationality","Nationality",
        "location","Location","Current Location","current_location",
        "linkedin","LinkedIn","LinkedIn Profile URL","linkedin_url",
        "portfolio","Portfolio","Portfolio / Website","portfolio_url",
        "current_title","JobTitle","job_title","Role/Position","role","position","Role",
        "experience","Experience","total_experience","Total Experience","years_of_experience",
        "employment_status","EmploymentStatus","Employment Status",
        "notice_period","NoticePeriod","Notice Period","When can you start?","availability","Availability",
        "salary","Salary","salary_expectation","Current / Previous Salary","Salary Expectation",
        "remote_preference","RemotePref","Work Preference","remote_pref",
        "visa_status","VisaStatus","Visa Status","Visa / Work Permit Status","work_authorization",
        "willing_to_relocate","WillingToReloc","Willing to Relocate?",
        "qualification","Qualification","Highest Qualification","education",
        "certifications","Certifications","Professional Certifications",
        "languages","Languages","Languages Spoken",
        "skills","Skills",
    }
    extra = {k: v for k, v in candidate_data.items() if k not in KNOWN_KEYS and v}

    def _apply(c: Candidate):
        if phone:             c.phone              = phone
        if age:               c.age                = age
        if gender:            c.gender             = gender
        if nationality:       c.nationality        = nationality
        if location:          c.location           = location
        if linkedin_url:      c.linkedin_url       = linkedin_url
        if portfolio_url:     c.portfolio_url      = portfolio_url
        if title:             c.current_title      = title
        if exp_years:         c.years_of_experience = exp_years
        if employment_status: c.employment_status  = employment_status
        if notice_period:     c.notice_period      = notice_period
        if salary:            c.salary_expectation = salary
        if remote_pref:       c.remote_preference  = remote_pref
        if visa:              c.work_authorization = visa
        if willing_reloc:     c.willing_to_relocate = willing_reloc
        if qualification:     c.education          = qualification
        if certifications:    c.certifications     = certifications
        if languages:         c.languages          = languages
        if skills:            c.skills             = skills
        if extra:
            merged = dict(c.extra_data or {})
            merged.update(extra)
            c.extra_data = merged

    # ── Upsert: only match active (non-deleted) candidates ───────────────────
    from sqlalchemy import func as sqlfunc
    existing = await db.execute(
        select(Candidate).where(
            Candidate.client_id == client_id,
            sqlfunc.lower(Candidate.email) == email,
            Candidate.deleted_at.is_(None),
        ).order_by(Candidate.id.desc())
    )
    existing_candidate = existing.scalars().first()

    def _make_cv_upload(candidate_id: int) -> CVUpload:
        """Upload CV to R2 with the real candidate ID, then build the CVUpload record."""
        nonlocal r2_object_key
        final_key = r2_object_key  # may be None if R2 not yet attempted

        # Attempt R2 upload now that we have the real candidate ID
        if cv_bytes and client_slug and not final_key:
            try:
                from app.services.r2_storage import upload_cv as r2_upload_cv
                r2_result = r2_upload_cv(
                    file_bytes=cv_bytes,
                    original_filename=original_filename or "cv.pdf",
                    client_slug=client_slug,
                    candidate_id=candidate_id,
                )
                final_key = r2_result["object_key"]
                r2_object_key = final_key
                logger.info(f"[portal/_save_candidate] R2 upload OK: {final_key}")
            except Exception as e:
                logger.warning(f"[portal/_save_candidate] R2 upload failed, using local: {e}")

        storage = final_key if final_key else (cv_file_path or "")
        stored_name = final_key.split("/")[-1] if final_key else (os.path.basename(cv_file_path) if cv_file_path else "")
        if final_key and cv_bytes:
            file_size = len(cv_bytes)
        elif not final_key and cv_file_path and os.path.exists(cv_file_path):
            file_size = os.path.getsize(cv_file_path)
        else:
            file_size = None
        ext_raw = os.path.splitext(original_filename or cv_file_path or "")[1].lstrip(".")
        return CVUpload(
            candidate_id=candidate_id,
            original_filename=original_filename or "",
            stored_filename=stored_name,
            file_size=file_size,
            file_type=ext_raw,
            storage_path=storage,
            parsed_text=cv_text,
            parsing_status="completed",
            is_latest=True,
            ai_extracted_data=json.dumps(candidate_data),
        )

    if existing_candidate:
        _apply(existing_candidate)
        if original_filename:
            db.add(_make_cv_upload(existing_candidate.id))
        db.add(ActivityLog(
            client_id=client_id, user_type="system", action="candidate_updated",
            entity_type="candidate", entity_id=existing_candidate.id,
            description=f"Candidate {name} updated via CV Evaluator"
        ))
        await db.commit()
        return

    candidate = Candidate(client_id=client_id, name=_to_str(name), email=email, source="cv_evaluator")
    _apply(candidate)
    db.add(candidate)
    await db.flush()

    if original_filename:
        db.add(_make_cv_upload(candidate.id))
    db.add(ActivityLog(
        client_id=client_id, user_type="system", action="candidate_created",
        entity_type="candidate", entity_id=candidate.id,
        description=f"New candidate {name} created via CV Evaluator"
    ))
    await db.commit()
    logger.info(f"CV Evaluator: Saved candidate {name} (email={email}) for client {client_id} | R2={r2_object_key or 'local'}")


def _parse_years(value) -> Optional[int]:
    """Try to extract integer years from a string."""
    if not value:
        return None
    import re
    match = re.search(r"(\d+)", str(value))
    return int(match.group(1)) if match else None
