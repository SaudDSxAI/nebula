
import json
import logging
import os
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.candidate import Candidate, Applicant
from app.models.requirement import Requirement
from app.models.client import Client
from app.utils.file_processing import read_file_async

logger = logging.getLogger(__name__)

# Load .env explicitly for background tasks
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(env_path)

# Lazy OpenAI client
_openai_client = None

def get_openai_client() -> AsyncOpenAI:
    """Lazy-initialize OpenAI client so .env is loaded first."""
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set in environment")
        _openai_client = AsyncOpenAI(api_key=api_key)
    return _openai_client

CV_PARSER_PROMPT = """
You are a data extraction system. Extract CV information and return ONLY valid JSON.

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
  "current_title": "Current job title",
  "current_company": "Current company name",
  "summary": "Brief professional summary (max 200 words)",
  "skills": ["Array", "of", "skills", "strings"],
  "education": [{"degree": "Degree Name", "institution": "University Name", "year": "Year"}],
  "certifications": ["Array", "of", "certifications"],
  "years_of_experience": 5
}
"""

async def parse_cv_and_save(
    file_path: str,
    job_id: int,
    manual_fields: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Parse CV file and save to database.
    Handles its own DB session for background execution.
    """
    async with AsyncSessionLocal() as db:
        try:
            # 1. Read File
            # We await this here, assuming file is on disk
            read_result = await read_file_async(file_path)
            
            if not read_result["success"]:
                logger.error(f"Failed to read file {file_path}: {read_result.get('error')}")
                # We should probably update the application status if possible, 
                # but we haven't created it yet. 
                return {"success": False, "error": read_result.get("error")}
            
            cv_text = read_result.get("content", "")
            if not cv_text:
                 return {"success": False, "error": "Empty text extracted"}
                 
            # 2. Extract Data using LLM
            try:
                openai_client = get_openai_client()
                chat_completion = await openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": CV_PARSER_PROMPT},
                        {"role": "user", "content": f"CV TEXT:\n{cv_text[:15000]}"}
                    ],
                    response_format={"type": "json_object"}
                )
                extracted_data = json.loads(chat_completion.choices[0].message.content)
            except Exception as e:
                logger.error(f"OpenAI error: {e}")
                extracted_data = {} # Fallback

            # 3. Merge Manual Fields (override extracted)
            if manual_fields:
                if manual_fields.get("name"): extracted_data["name"] = manual_fields["name"]
                if manual_fields.get("email"): extracted_data["email"] = manual_fields["email"]
                if manual_fields.get("phone"): extracted_data["phone"] = manual_fields["phone"]

            # 4. Get Job
            stmt = select(Requirement).where(Requirement.id == job_id)
            result = await db.execute(stmt)
            job = result.scalar_one_or_none()
            
            if not job:
                logger.error(f"Job {job_id} not found during parsing")
                return {"success": False, "error": "Job not found"}
            
            client_id = job.client_id
            
            # 5. Find or Create Candidate
            # We map email to find existing candidate for THIS client
            candidate_email = extracted_data.get("email")
            if not candidate_email:
                 # Fallback if email not parsed? Use manual field if available, else random or skip?
                 # Assuming manual_fields has email as it's required in form
                 candidate_email = "unknown@example.com" 
            
            stmt = select(Candidate).where(
                Candidate.email == candidate_email,
                Candidate.client_id == client_id
            )
            result = await db.execute(stmt)
            candidate = result.scalar_one_or_none()
            
            if candidate:
                # Update info
                candidate.name = extracted_data.get("name") or candidate.name
                candidate.phone = extracted_data.get("phone") or candidate.phone
                candidate.location = extracted_data.get("location") or candidate.location
                candidate.current_title = extracted_data.get("current_title") or candidate.current_title
                candidate.current_company = extracted_data.get("current_company") or candidate.current_company
                candidate.years_of_experience = extracted_data.get("years_of_experience")
                # Merge lists?
                if extracted_data.get("skills"):
                     candidate.skills = json.dumps(extracted_data.get("skills"))
                candidate.ai_summary = extracted_data.get("summary")
                candidate.updated_at = datetime.utcnow()
            else:
                candidate = Candidate(
                    client_id=client_id,
                    email=candidate_email,
                    name=extracted_data.get("name") or "Unknown",
                    phone=extracted_data.get("phone"),
                    location=extracted_data.get("location"),
                    current_title=extracted_data.get("current_title"),
                    current_company=extracted_data.get("current_company"),
                    years_of_experience=extracted_data.get("years_of_experience"),
                    skills=json.dumps(extracted_data.get("skills", [])),
                    education=json.dumps(extracted_data.get("education", [])),
                    certifications=json.dumps(extracted_data.get("certifications", [])),
                    ai_summary=extracted_data.get("summary"),
                    source="Public Job Board",
                    is_active=True
                )
                db.add(candidate)
                await db.flush() # Populate ID
            
            # 6. Create Applicant
            stmt = select(Applicant).where(
                Applicant.candidate_id == candidate.id,
                Applicant.requirement_id == job_id
            )
            result = await db.execute(stmt)
            applicant = result.scalar_one_or_none()
            
            if not applicant:
                applicant = Applicant(
                    candidate_id=candidate.id,
                    requirement_id=job_id,
                    status="applied",
                    applied_at=datetime.utcnow(),
                    ai_match_score="Pending"
                )
                db.add(applicant)
                await db.commit()
                logger.info(f"Created application {applicant.id} for candidate {candidate.id}")

                # 7. Auto-trigger AI matching score
                try:
                    from app.services.ai_service import score_candidate_for_job
                    score_result = await score_candidate_for_job(candidate.id, job_id)
                    if score_result.get("success"):
                        logger.info(f"AI Match Score: {score_result.get('score')}% ({score_result.get('grade')})")
                    else:
                        logger.warning(f"AI scoring returned: {score_result.get('error')}")
                except Exception as score_err:
                    logger.warning(f"AI scoring skipped: {score_err}")
            else:
                logger.info(f"Applicant already exists for candidate {candidate.id}")
            
            return {
                "success": True,
                "candidate_id": candidate.id,
                "application_id": applicant.id if applicant else None
            }
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error in CV parsing task: {e}")
            return {"success": False, "error": str(e)}

