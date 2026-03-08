"""
AI Requirement Parser — converts raw text into structured JSON.
Ported from coter_global_agent/requirements_ai_service.py and adapted for the new stack.
"""
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert recruitment requirement parser for a staffing agency.

Your job: take raw, messy requirement text and convert it into a CLEAN, STRUCTURED JSON object.

ALWAYS return a JSON object with these keys:

REQUIRED KEYS (always include):
- "title": string — Use the user's EXACT role/position wording as the title. Do NOT rephrase, simplify, or shorten it. If the user wrote "HSE Engineer (could be Senior HSE Officer)" then the title MUST be "HSE Engineer (could be Senior HSE Officer)". You may prepend quantity and append location, e.g. "12x HSE Engineer (could be Senior HSE Officer) — UAE"
- "role": string — The EXACT job role/position AS WRITTEN by the user. Do NOT normalize, merge, split, or change the role title in any way. Preserve parenthetical notes, slashes, alternatives, and qualifiers exactly.
- "company_name": string — Company name if mentioned, otherwise "TBD"
- "location": string — Work location (e.g. "UAE", "Dubai", "Saudi Arabia")
- "status": string — Always "open" for new requirements

OPTIONAL KEYS (include only if mentioned or inferable):
- "positions": number — Number of positions needed (default 1)
- "salary_min": number — Minimum salary (in local currency)
- "salary_max": number — Maximum salary
- "salary_currency": string — Currency code (default "USD")
- "experience_required": string — e.g. "3-5 years", "5+ years"
- "priority": string — "urgent", "high", "medium", or "low" (infer from tone)
- "visa_requirement": string — e.g. "Must have own visa", "Company provides visa"
- "benefits": list of strings — e.g. ["Accommodation", "Transportation", "Medical Insurance"]
- "skills": list of strings — Required skills/certifications
- "certifications": list of strings — e.g. ["NEBOSH", "IOSH", "First Aid"]
- "employment_type": string — "Full-time", "Part-time", "Contract"
- "remote_type": string — "remote", "hybrid", or "onsite"
- "nationality_preference": string — if mentioned
- "education": string — Required education level
- "description": string — Full job description derived from the text
- "note": string — Any additional info that doesn't fit above fields
- "due_date": string — YYYY-MM-DD if a deadline is mentioned

CRITICAL RULES:
1. ALWAYS return valid JSON — no explanations, no markdown, just JSON
2. NEVER change, rephrase, normalize, or simplify the job title/role. The user's EXACT words are the requirement.
3. Fix obvious typos in common words but NEVER change professional role titles or job position names
4. Parse salary intelligently: "4k to 5k" → salary_min: 4000, salary_max: 5000
5. Infer priority from words like "urgent", "ASAP", "immediate" → "urgent"
6. If benefits like accommodation/transportation are mentioned, extract them into the benefits list
7. If number of positions is mentioned (e.g. "need 12 HSE officers"), set positions accordingly
"""


async def parse_requirement_text(raw_text: str) -> Optional[Dict[str, Any]]:
    """Parse raw requirement text into structured JSON using OpenAI."""
    try:
        from app.services.cv_parser import get_openai_client

        client = get_openai_client()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": raw_text},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=1500,
        )
        content = response.choices[0].message.content.strip()

        # Clean markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        parsed = json.loads(content.strip())

        # Ensure required fields have defaults
        if not parsed.get("title"):
            parsed["title"] = parsed.get("role", "General Requirement")
        if not parsed.get("role"):
            parsed["role"] = parsed.get("title", "General Position")
        if not parsed.get("company_name"):
            parsed["company_name"] = "TBD"
        if not parsed.get("location"):
            parsed["location"] = ""
        if not parsed.get("status"):
            parsed["status"] = "open"
        if not parsed.get("priority"):
            parsed["priority"] = "medium"

        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"AI requirement parse error (JSON): {e}")
        return None
    except Exception as e:
        logger.error(f"AI requirement parse error: {e}")
        return None
