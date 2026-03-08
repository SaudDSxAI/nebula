"""
Client Portal - Company Settings Routes
Allows clients to manage their company data (used by AI assistant)
"""
import os
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel

from app.database import get_db
from app.models.client import Client, ClientSettings
from app.middleware.auth import require_client
from app.services.company_assistant import build_assistant
from app.utils.file_processing import read_file_async

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/client/company", tags=["Client - Company"])


# --- Schemas ---

class CompanyDataResponse(BaseModel):
    company_name: str
    unique_subdomain: Optional[str] = None
    company_description: Optional[str] = None
    company_data: Optional[str] = None
    assistant_prompt: Optional[str] = None
    portal_link: Optional[str] = None

    class Config:
        from_attributes = True


class CompanyDataUpdate(BaseModel):
    company_description: Optional[str] = None
    company_data: Optional[str] = None
    assistant_prompt: Optional[str] = None


# --- Routes ---

@router.get("", response_model=CompanyDataResponse)
async def get_company_data(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db)
):
    """Get company data for the current client."""
    client_id = current_user["user_id"]
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    settings_result = await db.execute(
        select(ClientSettings).where(ClientSettings.client_id == client_id)
    )
    settings = settings_result.scalar_one_or_none()

    return CompanyDataResponse(
        company_name=client.company_name,
        unique_subdomain=client.unique_subdomain,
        company_description=client.company_description,
        company_data=client.company_data,
        assistant_prompt=settings.custom_ai_instructions if settings else None,
        portal_link=f"/c/{client.unique_subdomain}" if client.unique_subdomain else None,
    )


@router.put("", response_model=CompanyDataResponse)
async def update_company_data(
    data: CompanyDataUpdate,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db)
):
    """Update company data. This refreshes the AI assistant's knowledge base."""
    client_id = current_user["user_id"]
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Update company knowledge base fields
    for field in ("company_description", "company_data"):
        val = getattr(data, field, None)
        if val is not None:
            setattr(client, field, val)

    # When user explicitly sets company_data (the KB text box), clear the old
    # company_description so stale data doesn't persist in the assistant's context.
    if data.company_data is not None and data.company_data.strip():
        client.company_description = None

    # Update assistant prompt in ClientSettings
    if data.assistant_prompt is not None:
        settings_result = await db.execute(
            select(ClientSettings).where(ClientSettings.client_id == client_id)
        )
        settings = settings_result.scalar_one_or_none()
        if settings:
            settings.custom_ai_instructions = data.assistant_prompt
        else:
            settings = ClientSettings(
                client_id=client_id,
                custom_ai_instructions=data.assistant_prompt
            )
            db.add(settings)

    # Force-update timestamp so the build_key always changes on save,
    # which invalidates the disk cache and triggers a fresh embed.
    from datetime import datetime
    client.updated_at = datetime.utcnow()
    if data.assistant_prompt is not None and settings:
        settings.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(client)

    # Refresh settings for the rebuild
    settings_result = await db.execute(
        select(ClientSettings).where(ClientSettings.client_id == client_id)
    )
    settings = settings_result.scalar_one_or_none()
    custom_prompt = settings.custom_ai_instructions if settings else None
    company_text = _build_company_text(client)

    # Hot-swap assistant on app.state — exact same pattern as coter-global-agent
    from app.main import app as _app
    if not hasattr(_app.state, 'assistants'):
        _app.state.assistants = {}
    if not hasattr(_app.state, 'assistant_keys'):
        _app.state.assistant_keys = {}

    # build_key from fresh DB timestamps
    build_key = f"{client.updated_at}|{settings.updated_at if settings else ''}"

    new_instance = await build_assistant(
        company_name=client.company_name,
        company_text=company_text,
        custom_prompt=custom_prompt,
        client_id=client_id,
        build_key=build_key,
    )
    _app.state.assistants[client_id] = new_instance
    # Set the key so portal.py sees the cached assistant as current and won't rebuild
    _app.state.assistant_keys[client_id] = build_key
    logger.info(f"[company] Hot-swapped assistant for client {client_id} — {new_instance.store.size} chunks")

    return CompanyDataResponse(
        company_name=client.company_name,
        unique_subdomain=client.unique_subdomain,
        company_description=client.company_description,
        company_data=client.company_data,
        assistant_prompt=settings.custom_ai_instructions if settings else None,
        portal_link=f"/c/{client.unique_subdomain}" if client.unique_subdomain else None,
    )


# ======================================================
# LOGO UPLOAD
# ======================================================

@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Upload or replace company logo. Returns the new logo_url."""
    client_id = current_user["client_id"]
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Validate image type
    allowed_exts = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
    filename = file.filename or "logo"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: PNG, JPG, GIF, WebP")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Maximum size is 5MB.")

    # Save to uploads/logos/
    logo_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "logos")
    os.makedirs(logo_dir, exist_ok=True)
    save_name = f"client_{client_id}_logo{ext}"
    save_path = os.path.join(logo_dir, save_name)
    with open(save_path, "wb") as f:
        f.write(content)

    # Build public URL (served by FastAPI StaticFiles at /static/logos/)
    logo_url = f"/static/logos/{save_name}"
    client.logo_url = logo_url
    client.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(client)
    return {"logo_url": logo_url}


@router.delete("/logo")
async def delete_logo(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Remove company logo."""
    client_id = current_user["client_id"]
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.logo_url = None
    client.updated_at = datetime.utcnow()
    await db.commit()
    return {"message": "Logo removed"}


@router.post("/upload")
async def upload_company_document(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db)
):
    """Upload a PDF/DOCX/TXT file to replace company data."""
    client_id = current_user["user_id"]
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Validate file type
    allowed_extensions = {".pdf", ".doc", ".docx", ".txt"}
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: PDF, DOC, DOCX, TXT"
        )

    # Validate file size (10MB max)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    # Save temp file for processing
    temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "company_docs")
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"client_{client_id}_{filename}")

    with open(temp_path, "wb") as f:
        f.write(content)

    try:
        # Extract text from file
        read_result = await read_file_async(temp_path)

        if not read_result["success"]:
            error_msg = read_result.get("error", "unknown")
            if error_msg == "scanned_cv":
                raise HTTPException(
                    status_code=400,
                    detail="Could not extract text from this file. It may be a scanned image. Please use a text-based document."
                )
            raise HTTPException(status_code=400, detail=f"Failed to process file: {error_msg}")

        extracted_text = read_result["content"]

        # Update company data with extracted text
        # REMOVED: client.company_description = extracted_text (Fix for Issue 1)
        client.company_data = extracted_text
        client.updated_at = datetime.utcnow()  # force timestamp change
        await db.commit()
        await db.refresh(client)

        # Hot-swap assistant on app.state
        company_text = _build_company_text(client)
        settings_res = await db.execute(select(ClientSettings).where(ClientSettings.client_id == client_id))
        settings = settings_res.scalar_one_or_none()
        custom_prompt = settings.custom_ai_instructions if settings else None
        build_key = f"{client.updated_at}|{settings.updated_at if settings else ''}"

        from app.main import app as _app
        if not hasattr(_app.state, 'assistants'):
            _app.state.assistants = {}
        if not hasattr(_app.state, 'assistant_keys'):
            _app.state.assistant_keys = {}

        new_instance = await build_assistant(
            company_name=client.company_name,
            company_text=company_text,
            custom_prompt=custom_prompt,
            client_id=client_id,
            build_key=build_key,
        )
        _app.state.assistants[client_id] = new_instance
        _app.state.assistant_keys[client_id] = build_key
        logger.info(f"[company] File upload hot-swapped assistant for client {client_id} — {new_instance.store.size} chunks")

        return {
            "success": True,
            "message": f"File processed successfully. {len(extracted_text)} characters extracted.",
            "characters": len(extracted_text),
        }

    finally:
        # Clean up temp file
        try:
            os.remove(temp_path)
        except OSError:
            pass


def _build_company_text(client: Client) -> str:
    """Build combined company text from all available fields."""
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


# ── CV Evaluator Prompt endpoints ────────────────────────────────────────────

def _load_default_evaluator_prompt() -> str:
    """Return the default cv_evaluator.txt content."""
    from pathlib import Path
    p = Path(__file__).parent.parent / "prompts" / "cv_evaluator.txt"
    return p.read_text(encoding="utf-8") if p.exists() else ""


class EvaluatorPromptUpdate(BaseModel):
    evaluator_prompt: Optional[str] = None  # None = revert to default


@router.get("/evaluator-prompt")
async def get_evaluator_prompt(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Return the client's custom evaluator prompt (or the system default if none set)."""
    client_id = current_user["user_id"]
    result = await db.execute(select(ClientSettings).where(ClientSettings.client_id == client_id))
    settings = result.scalar_one_or_none()
    custom = settings.evaluator_prompt if settings else None
    return {
        "evaluator_prompt": custom,          # null = using default
        "default_prompt": _load_default_evaluator_prompt(),
    }


@router.put("/evaluator-prompt")
async def update_evaluator_prompt(
    data: EvaluatorPromptUpdate,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Save (or clear) the custom CV evaluator prompt."""
    client_id = current_user["user_id"]
    result = await db.execute(select(ClientSettings).where(ClientSettings.client_id == client_id))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = ClientSettings(client_id=client_id)
        db.add(settings)
    settings.evaluator_prompt = data.evaluator_prompt or None   # store None = use default
    await db.commit()
    return {"evaluator_prompt": settings.evaluator_prompt, "saved": True}


# ── Visual Field Builder (Screening) endpoints ────────────────────────────────

DEFAULT_SCREENING_FIELDS = [
    {"field": "Phone",            "label": "Phone Number",                "type": "text",   "placeholder": "",                      "options": []},
    {"field": "Age",              "label": "Age (years)",                  "type": "number", "placeholder": "",                      "options": []},
    {"field": "Nationality",      "label": "Nationality",                  "type": "text",   "placeholder": "",                      "options": []},
    {"field": "Location",         "label": "Current Location",             "type": "text",   "placeholder": "",                      "options": []},
    {"field": "Email",            "label": "Email Address",                "type": "email",  "placeholder": "",                      "options": []},
    {"field": "JobTitle",         "label": "Current / Recent Job Title",   "type": "text",   "placeholder": "",                      "options": []},
    {"field": "EmploymentStatus", "label": "Employment Status",            "type": "select", "placeholder": "",                      "options": ["Employed", "Unemployed"]},
    {"field": "NoticePeriod",     "label": "When can you start?",          "type": "select", "placeholder": "",                      "options": ["Immediate", "2 weeks", "1 month", "2 months", "Other"]},
    {"field": "Experience",       "label": "Total Experience (years)",     "type": "number", "placeholder": "",                      "options": []},
    {"field": "Salary",           "label": "Current / Previous Salary",    "type": "text",   "placeholder": "",                      "options": []},
    {"field": "Qualification",    "label": "Highest Qualification",        "type": "select", "placeholder": "",                      "options": ["High School", "Diploma", "Bachelor's", "Master's", "PhD", "Other"]},
    {"field": "Certifications",   "label": "Professional Certifications",  "type": "text",   "placeholder": "e.g. PMP, AWS, etc.",   "options": []},
]


def _generate_evaluator_prompt_from_fields(fields: list) -> str:
    """Auto-generate the cv_evaluator system prompt from the given field list."""
    import json as _json

    prompt_fields = []
    field_labels = []
    for f in fields:
        opts = f.get("options") or []
        prompt_fields.append({
            "field":       f["field"],
            "label":       f["label"],
            "type":        f["type"],
            "placeholder": f.get("placeholder") or "",
            "options":     opts if opts else None,
        })
        field_labels.append(f["label"])

    fields_json = _json.dumps(prompt_fields, indent=2)
    labels_list = ", ".join(f'"{l}"' for l in field_labels)

    return (
        "You are a CV Information Collector.\n\n"
        "Your ONLY job is to check whether the following SPECIFIC fields are present in the CV:\n\n"
        f"REQUIRED FIELDS (THIS IS THE COMPLETE LIST — DO NOT ADD ANY OTHERS):\n"
        f"{labels_list}\n\n"
        "STRICT RULES — READ CAREFULLY:\n"
        "1. You MUST NOT ask for any field not in the list above — not education, not phone, not skills, NOTHING else.\n"
        "2. Check ONLY the fields listed above. Ignore everything else.\n"
        "3. If a field from the list is missing from the CV, include it in missing_fields.\n"
        "4. If a field from the list is present in the CV, do NOT include it.\n"
        "5. Return ONLY valid JSON — no explanations, no other text.\n\n"
        "IF ANY LISTED FIELDS ARE MISSING FROM THE CV:\n\n"
        "Return a JSON object — only include the subset of fields that are ACTUALLY missing:\n\n"
        f'{{"missing_fields": {fields_json}}}\n\n'
        "Filter the above list down to ONLY the fields that are missing. Do not include all of them if some are present.\n\n"
        "IF ALL LISTED FIELDS ARE COMPLETE:\n\n"
        'Output EXACTLY: "✅ COMPLETE"\n\n'
        'DO NOT return JSON. DO NOT return any other text. Just "✅ COMPLETE".\n'
    )


class ScreeningFieldsUpdate(BaseModel):
    fields: list


@router.get("/screening-fields")
async def get_screening_fields(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Return the client's saved screening fields (or system defaults)."""
    client_id = current_user["user_id"]
    result = await db.execute(select(ClientSettings).where(ClientSettings.client_id == client_id))
    settings = result.scalar_one_or_none()
    saved = settings.evaluator_fields if settings and settings.evaluator_fields else None
    return {
        "fields":          saved or DEFAULT_SCREENING_FIELDS,
        "is_custom":       saved is not None,
        "default_fields":  DEFAULT_SCREENING_FIELDS,
    }


@router.put("/screening-fields")
async def update_screening_fields(
    data: ScreeningFieldsUpdate,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Save the field list and auto-generate the evaluator prompt from it."""
    client_id = current_user["user_id"]
    result = await db.execute(select(ClientSettings).where(ClientSettings.client_id == client_id))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = ClientSettings(client_id=client_id)
        db.add(settings)

    settings.evaluator_fields  = data.fields
    settings.evaluator_prompt  = _generate_evaluator_prompt_from_fields(data.fields)
    flag_modified(settings, "evaluator_fields")
    flag_modified(settings, "evaluator_prompt")
    await db.commit()
    await db.refresh(settings)
    return {"fields": settings.evaluator_fields, "saved": True}


@router.delete("/screening-fields")
async def reset_screening_fields(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Reset to system defaults (clear custom fields + prompt)."""
    client_id = current_user["user_id"]
    result = await db.execute(select(ClientSettings).where(ClientSettings.client_id == client_id))
    settings = result.scalar_one_or_none()
    if settings:
        settings.evaluator_fields = None
        settings.evaluator_prompt = None
        await db.commit()
    return {"reset": True, "fields": DEFAULT_SCREENING_FIELDS}
