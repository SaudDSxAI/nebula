"""
AI Integration Service
Phase 8: AI-Powered Candidate Matching & Insights
"""
import json
import logging
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI
from sqlalchemy import select, update
from sqlalchemy.orm import joinedload

from app.database import AsyncSessionLocal
from app.models.candidate import Candidate, Applicant
from app.models.requirement import Requirement
from app.models.cv import CVUpload

logger = logging.getLogger(__name__)

# Load .env
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(env_path)

# Lazy OpenAI client
_openai_client = None

def get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")
        _openai_client = AsyncOpenAI(api_key=api_key)
    return _openai_client


# ========================
# AI CANDIDATE MATCHING
# ========================

MATCH_PROMPT = """
You are an expert recruiter AI. Score how well a candidate matches a job requirement.

JOB REQUIREMENT:
- Title: {job_title}
- Description: {job_description}
- Required Skills: {required_skills}
- Preferred Skills: {preferred_skills}
- Experience Level: {experience_level}
- Location: {location}

CANDIDATE PROFILE:
- Name: {candidate_name}
- Current Title: {current_title}
- Current Company: {current_company}
- Years of Experience: {years_experience}
- Skills: {candidate_skills}
- Education: {education}
- Certifications: {certifications}
- Location: {candidate_location}
- AI Summary: {ai_summary}

SCORING RULES:
1. Score from 0 to 100
2. Weight: Skills match (40%), Experience (25%), Education/Certs (15%), Location fit (10%), Overall fit (10%)
3. Be fair but realistic

Return ONLY valid JSON:
{{
  "score": 85,
  "grade": "A",
  "reasons": ["Strong React/TypeScript skills match", "5 years experience meets senior requirement"],
  "gaps": ["No AI/ML experience mentioned"],
  "recommendation": "Strong candidate for interview. Technical skills align well."
}}

Grade scale: A (90-100), B (75-89), C (60-74), D (40-59), F (0-39)
"""

async def score_candidate_for_job(
    candidate_id: int,
    requirement_id: int,
) -> Dict[str, Any]:
    """Score a single candidate against a job requirement using AI."""
    async with AsyncSessionLocal() as db:
        try:
            # Load candidate
            stmt = select(Candidate).where(Candidate.id == candidate_id)
            result = await db.execute(stmt)
            candidate = result.scalar_one_or_none()
            if not candidate:
                return {"success": False, "error": "Candidate not found"}

            # Load requirement
            stmt = select(Requirement).where(Requirement.id == requirement_id)
            result = await db.execute(stmt)
            requirement = result.scalar_one_or_none()
            if not requirement:
                return {"success": False, "error": "Requirement not found"}

            # Build prompt
            prompt = MATCH_PROMPT.format(
                job_title=requirement.job_title or "N/A",
                job_description=(requirement.job_description or "N/A")[:2000],
                required_skills=requirement.required_skills or "N/A",
                preferred_skills=requirement.preferred_skills or "N/A",
                experience_level=requirement.experience_level or "N/A",
                location=requirement.location or "N/A",
                candidate_name=candidate.name or "N/A",
                current_title=candidate.current_title or "N/A",
                current_company=candidate.current_company or "N/A",
                years_experience=candidate.years_of_experience or "N/A",
                candidate_skills=candidate.skills or "N/A",
                education=candidate.education or "N/A",
                certifications=candidate.certifications or "N/A",
                candidate_location=candidate.location or "N/A",
                ai_summary=candidate.ai_summary or "N/A",
            )

            # Call OpenAI
            client = get_openai_client()
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert AI recruiter scoring candidates."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )

            match_data = json.loads(response.choices[0].message.content)
            score = match_data.get("score", 0)
            grade = match_data.get("grade", "F")

            # Update Applicant record
            stmt = select(Applicant).where(
                Applicant.candidate_id == candidate_id,
                Applicant.requirement_id == requirement_id
            )
            result = await db.execute(stmt)
            applicant = result.scalar_one_or_none()

            if applicant:
                applicant.ai_match_score = f"{score}% ({grade})"
                applicant.ai_match_reasons = json.dumps(match_data)
                applicant.updated_at = datetime.utcnow()
                await db.commit()
                logger.info(f"Scored candidate {candidate_id} for job {requirement_id}: {score}% ({grade})")

            return {
                "success": True,
                "candidate_id": candidate_id,
                "requirement_id": requirement_id,
                "score": score,
                "grade": grade,
                "reasons": match_data.get("reasons", []),
                "gaps": match_data.get("gaps", []),
                "recommendation": match_data.get("recommendation", ""),
            }

        except Exception as e:
            logger.error(f"AI matching error: {e}")
            return {"success": False, "error": str(e)}


async def score_all_candidates_for_job(requirement_id: int) -> Dict[str, Any]:
    """Score all candidates who applied for a specific job."""
    async with AsyncSessionLocal() as db:
        try:
            stmt = (
                select(Applicant)
                .where(Applicant.requirement_id == requirement_id)
            )
            result = await db.execute(stmt)
            applicants = result.scalars().all()

            if not applicants:
                return {"success": True, "message": "No applicants to score", "scored": 0}

            results = []
            for app in applicants:
                score_result = await score_candidate_for_job(app.candidate_id, requirement_id)
                results.append(score_result)

            scored = sum(1 for r in results if r.get("success"))
            return {
                "success": True,
                "total_applicants": len(applicants),
                "scored": scored,
                "results": results
            }

        except Exception as e:
            logger.error(f"Batch scoring error: {e}")
            return {"success": False, "error": str(e)}


# ========================
# AI JOB DESCRIPTION GENERATOR
# ========================

JD_GENERATOR_PROMPT = """
You are an expert HR copywriter. Generate a compelling job description based on the following details.

Job Title: {job_title}
Required Skills: {required_skills}
Experience Level: {experience_level}
Location: {location}
Remote Type: {remote_type}
Additional Notes: {notes}

Write a professional, engaging job description that includes:
1. Role Overview (2-3 sentences)
2. Key Responsibilities (5-7 bullet points)
3. Requirements (5-7 bullet points)
4. Nice to Have (3-4 bullet points)

Keep it concise, modern, and appealing. Use inclusive language.
Return plain text, not markdown.
"""

async def generate_job_description(
    job_title: str,
    required_skills: str = "",
    experience_level: str = "",
    location: str = "",
    remote_type: str = "hybrid",
    notes: str = ""
) -> Dict[str, Any]:
    """Generate an AI-powered job description."""
    try:
        prompt = JD_GENERATOR_PROMPT.format(
            job_title=job_title,
            required_skills=required_skills or "Not specified",
            experience_level=experience_level or "Not specified",
            location=location or "Not specified",
            remote_type=remote_type,
            notes=notes or "None",
        )

        client = get_openai_client()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional HR copywriter."},
                {"role": "user", "content": prompt}
            ],
            max_completion_tokens=1500,
        )

        description = response.choices[0].message.content
        return {"success": True, "description": description}

    except Exception as e:
        logger.error(f"JD generation error: {e}")
        return {"success": False, "error": str(e)}


# ========================
# AI CANDIDATE SUMMARY
# ========================

SUMMARY_PROMPT = """
Based on this candidate profile, write a concise 2-3 sentence professional summary.

Name: {name}
Title: {current_title}
Company: {current_company}
Experience: {years} years
Skills: {skills}
Education: {education}

Write in third person. Focus on key strengths and experience. Be concise.
"""

async def generate_candidate_summary(candidate_id: int) -> Dict[str, Any]:
    """Generate an AI summary for a candidate."""
    async with AsyncSessionLocal() as db:
        try:
            stmt = select(Candidate).where(Candidate.id == candidate_id)
            result = await db.execute(stmt)
            candidate = result.scalar_one_or_none()
            if not candidate:
                return {"success": False, "error": "Candidate not found"}

            prompt = SUMMARY_PROMPT.format(
                name=candidate.name or "N/A",
                current_title=candidate.current_title or "N/A",
                current_company=candidate.current_company or "N/A",
                years=candidate.years_of_experience or "N/A",
                skills=candidate.skills or "N/A",
                education=candidate.education or "N/A",
            )

            client = get_openai_client()
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You write concise professional summaries."},
                    {"role": "user", "content": prompt}
                ],
                max_completion_tokens=200,
            )

            summary = response.choices[0].message.content.strip()

            # Save to candidate
            candidate.ai_summary = summary
            candidate.updated_at = datetime.utcnow()
            await db.commit()

            return {"success": True, "candidate_id": candidate_id, "summary": summary}

        except Exception as e:
            logger.error(f"Summary generation error: {e}")
            return {"success": False, "error": str(e)}


# ========================
# AI CV Q&A
# ========================

async def ask_cv_question(candidate_id: int, question: str) -> Dict[str, Any]:
    """Ask a question about a candidate's CV using parsed text."""
    async with AsyncSessionLocal() as db:
        try:
            # First try to find a CV with parsed text (prefer latest)
            stmt = select(CVUpload).where(
                CVUpload.candidate_id == candidate_id,
                CVUpload.deleted_at.is_(None),
                CVUpload.parsed_text.isnot(None),
                CVUpload.parsed_text != "",
            ).order_by(CVUpload.uploaded_at.desc()).limit(1)
            result = await db.execute(stmt)
            cv = result.scalar_one_or_none()

            if not cv:
                # Fall back to ANY cv for this candidate (even without parsed text)
                stmt_any = select(CVUpload).where(
                    CVUpload.candidate_id == candidate_id,
                    CVUpload.deleted_at.is_(None),
                ).order_by(CVUpload.uploaded_at.desc()).limit(1)
                result_any = await db.execute(stmt_any)
                cv = result_any.scalar_one_or_none()

            if not cv or not cv.parsed_text:
                # Fall back to candidate profile data
                stmt2 = select(Candidate).where(Candidate.id == candidate_id)
                result2 = await db.execute(stmt2)
                candidate = result2.scalar_one_or_none()
                if not candidate:
                    return {"success": False, "error": "No CV or candidate found"}
                cv_text = f"Name: {candidate.name}\nTitle: {candidate.current_title}\nSkills: {candidate.skills}\nEducation: {candidate.education}\nCertifications: {candidate.certifications}\nSummary: {candidate.ai_summary}"
            else:
                cv_text = cv.parsed_text[:8000]  # limit context size

            system_prompt = (
                "You are an AI assistant that answers questions about a candidate's CV. "
                "Use ONLY the information provided in the CV text below. "
                "If the information is not in the CV, say so clearly. "
                "Be concise and precise.\n\n"
                f"CV CONTENT:\n{cv_text}"
            )

            client = get_openai_client()
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                max_tokens=800,
            )

            answer = response.choices[0].message.content.strip()
            return {"success": True, "answer": answer}

        except Exception as e:
            logger.error(f"CV Q&A error: {e}")
            return {"success": False, "error": str(e)}
