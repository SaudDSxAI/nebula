"""
CV Evaluator Service - 3-LLM Pipeline ported from coter_global_agent
Adapted for multi-tenant SaaS: each client has their own evaluation context.

Architecture:
  LLM 1 (Selector)  → Validates if input is a CV, creates summary
  LLM 2 (Evaluator) → Checks completeness, returns missing_fields JSON
  LLM 3 (Converter) → Converts complete CV to structured JSON
"""
import os
import json
import re
import asyncio
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime

from openai import AsyncOpenAI

# OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = "gpt-4o-mini"
MAX_JSON_CORRECTION_ATTEMPTS = 3


# ======================================================
# PROMPTS (loaded from files)
# ======================================================

def load_prompt(filename: str) -> str:
    """Load prompt from prompts directory."""
    # Ensure robust path resolution inside container runtime
    app_dir = Path(__file__).resolve().parent.parent
    prompt_path = app_dir / "prompts" / filename
    if prompt_path.exists():
        return prompt_path.read_text(encoding="utf-8")
    raise FileNotFoundError(f"Prompt file not found: {filename} at {prompt_path}")

# Load prompts on module import
CV_SELECTOR_PROMPT = load_prompt("cv_selector.txt")
CV_EVALUATOR_PROMPT = load_prompt("cv_evaluator.txt")
CV_JSON_CONVERTER_PROMPT = load_prompt("cv_json_converter.txt")


# ======================================================
# STATE MANAGEMENT
# ======================================================

@dataclass
class CVEvalState:
    """State management for CV evaluation workflow."""
    flag: bool = False
    cv_summary: str = ""
    original_cv: str = ""
    status: str = "idle"
    attempt_count: int = 0
    max_attempts: int = 5
    messages: list = field(default_factory=list)

    def activate_evaluation(self, cv_summary: str, original_cv: str):
        self.flag = True
        self.cv_summary = cv_summary
        self.original_cv = original_cv
        self.status = "evaluating"

    def append_fields(self, fields: Dict[str, str]):
        """Append user-submitted fields to CV summary with proper label mapping."""
        FIELD_MAPPINGS = {
            "name": "Name", "full name": "Name", "full_name": "Name",
            "age": "Age", "dob": "Age", "date of birth": "Age", "date_of_birth": "Age",
            "nationality": "Nationality",
            "phone": "Phone Number", "phone number": "Phone Number", "phone_number": "Phone Number",
            "contact": "Phone Number", "mobile": "Phone Number",
            "email": "Email", "e-mail": "Email",
            "location": "Current Location", "current location": "Current Location", "current_location": "Current Location",
            "role": "Role/Position", "position": "Role/Position", "job title": "Role/Position",
            "job_title": "Role/Position", "current_title": "Role/Position",
            "employment status": "Employment Status", "employment_status": "Employment Status",
            "current_job_status": "Employment Status",
            "availability": "Availability", "notice period": "Availability",
            "experience": "Total Experience", "total experience": "Total Experience",
            "total_experience": "Total Experience", "years_of_experience": "Total Experience",
            "gulf experience": "Experience in Gulf", "gulf_experience": "Experience in Gulf",
            "qualifications": "Major Qualifications", "education": "Major Qualifications",
            "major_qualifications": "Major Qualifications",
            "certifications": "Certifications", "visa": "Visa Status",
            "visa status": "Visa Status", "visa_status": "Visa Status",
            "salary": "Previous Salary", "previous_salary": "Previous Salary",
            "skills": "Skills", "languages": "Languages",
        }
        for field_name, value in fields.items():
            if value and str(value).strip():
                key = field_name.lower().replace("-", " ")
                proper_label = FIELD_MAPPINGS.get(key, field_name)
                self.cv_summary += f"\n\n{proper_label}: {value}"

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content[:500]})

    def reset(self):
        self.flag = False
        self.cv_summary = ""
        self.original_cv = ""
        self.status = "idle"
        self.attempt_count = 0
        self.messages = []

    def to_dict(self) -> dict:
        return {
            "flag": self.flag,
            "cv_summary": self.cv_summary,
            "original_cv": self.original_cv[:2000],
            "status": self.status,
            "attempt_count": self.attempt_count,
            "messages": self.messages[-20:],
        }

    @classmethod
    def from_dict(cls, data: dict) -> "CVEvalState":
        state = cls()
        state.flag = data.get("flag", False)
        state.cv_summary = data.get("cv_summary", "")
        state.original_cv = data.get("original_cv", "")
        state.status = data.get("status", "idle")
        state.attempt_count = data.get("attempt_count", 0)
        state.messages = data.get("messages", [])
        return state


# ======================================================
# LLM 1: CV SELECTOR
# ======================================================

async def cv_selector(user_input: str) -> Dict[str, Any]:
    """Detects if input is a CV and generates summary."""
    if not user_input or len(user_input.strip()) < 10:
        return {
            "type": "TEXT",
            "category": "GENERAL",
            "summary": None,
            "message": "⚠️ Please provide a complete CV."
        }

    response = await client.chat.completions.create(
        model=MODEL,

        messages=[
            {"role": "system", "content": CV_SELECTOR_PROMPT},
            {"role": "user", "content": f"USER INPUT:\n{user_input[:8000]}"}
        ]
    )
    result = response.choices[0].message.content.strip()

    if "⚠️" in result or "doesn't appear" in result.lower():
        return {
            "type": "TEXT",
            "category": "GENERAL",
            "summary": None,
            "message": result
        }

    return {
        "type": "CV",
        "category": "VALID",
        "summary": result,
        "message": "✅ CV detected. Checking completeness..."
    }


# ======================================================
# LLM 2: CV EVALUATOR
# ======================================================

async def cv_evaluator(cv_summary: str, custom_prompt: str | None = None) -> Dict[str, Any]:
    """Evaluates CV completeness, returns missing fields JSON."""
    prompt_to_use = custom_prompt.strip() if custom_prompt and custom_prompt.strip() else CV_EVALUATOR_PROMPT
    response = await client.chat.completions.create(
        model=MODEL,

        messages=[
            {"role": "system", "content": prompt_to_use},
            {"role": "user", "content": f"CV SUMMARY:\n{cv_summary}"}
        ]
    )
    result = response.choices[0].message.content.strip()


    if "✅ COMPLETE" in result:
        return {"complete": True, "message": result}

    # Try to extract missing_fields JSON
    if '"missing_fields"' in result:
        try:
            json_match = re.search(r'\{[\s\S]*"missing_fields"[\s\S]*\}', result)
            if json_match:
                parsed = json.loads(json_match.group(0))
                if parsed.get("missing_fields"):
                    return {
                        "complete": False,
                        "message": result,
                        "missing_fields": parsed["missing_fields"]
                    }
        except json.JSONDecodeError:
            pass

    return {"complete": False, "message": result, "missing_fields": []}


# ======================================================
# LLM 3: JSON CONVERTER
# ======================================================

async def cv_to_json(cv_summary: str, previous_invalid: str = None) -> str:
    """Converts complete CV summary to structured JSON."""
    if previous_invalid:
        user_msg = (
            f"The following JSON is invalid:\n```json\n{previous_invalid}\n```\n\n"
            f"Please correct it based on this CV summary:\n\n{cv_summary}"
        )
    else:
        user_msg = f"CV SUMMARY:\n{cv_summary}"

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": CV_JSON_CONVERTER_PROMPT},
            {"role": "user", "content": user_msg}
        ]
    )
    result = response.choices[0].message.content.strip()

    # Clean markdown
    if "```json" in result:
        result = result.split("```json")[1].split("```")[0].strip()
    elif "```" in result:
        result = result.split("```")[1].split("```")[0].strip()

    return result


# ======================================================
# JSON VALIDATION
# ======================================================

async def validate_and_correct_json(cv_summary: str, json_response: str) -> Dict[str, Any]:
    """Validates JSON, retries with LLM if invalid."""
    for attempt in range(1, MAX_JSON_CORRECTION_ATTEMPTS + 1):
        try:
            candidate_data = json.loads(json_response)
            has_name = any(k in candidate_data for k in ["name", "Name", "Full Name"])
            if not has_name and attempt < MAX_JSON_CORRECTION_ATTEMPTS:
                json_response = await cv_to_json(cv_summary, json_response)
                continue
            return {"valid": True, "data": candidate_data, "attempts": attempt}
        except json.JSONDecodeError:
            if attempt < MAX_JSON_CORRECTION_ATTEMPTS:
                json_response = await cv_to_json(cv_summary, json_response)
            else:
                return {
                    "valid": False, "data": None,
                    "attempts": attempt, "raw_response": json_response
                }
    return {"valid": False, "data": None, "attempts": MAX_JSON_CORRECTION_ATTEMPTS}


# ======================================================
# MAIN PROCESSOR
# ======================================================

class CVEvaluatorProcessor:
    """Main CV processing interface — 3-LLM architecture."""

    @staticmethod
    async def process(state: CVEvalState, user_input: str, is_file_upload: bool = False, custom_evaluator_prompt: str | None = None) -> Dict[str, Any]:
        """
        Process user input through the 3-LLM CV evaluation pipeline.

        Returns dict with:
          - response: str (message to display)
          - missing_fields: list (if form needed)
          - candidate_data: dict (if CV complete)
          - status: str
        """
        state.add_message("user", user_input[:500])

        # Handle reset
        if user_input.lower().strip() in ["reset", "cancel", "exit"]:
            state.reset()
            return {
                "response": "CV evaluation cancelled. Upload a new CV to start fresh.",
                "status": "reset"
            }

        # Check retry limit
        if state.attempt_count >= state.max_attempts:
            state.reset()
            return {
                "response": "Maximum attempts reached. Please upload a complete CV.",
                "status": "max_attempts"
            }

        # --- FLAG = FALSE -> LLM 1 (Selector) ---
        if not state.flag:
            result = await cv_selector(user_input)

            if result["type"] == "TEXT":
                state.add_message("assistant", result["message"])
                return {"response": result["message"], "status": "not_cv"}

            # CV detected -> run evaluator
            state.activate_evaluation(result["summary"], user_input)
            evaluation = await cv_evaluator(state.cv_summary, custom_prompt=custom_evaluator_prompt)
            state.attempt_count += 1

            if evaluation["complete"]:
                # Directly convert to JSON
                json_str = await cv_to_json(state.cv_summary)
                validation = await validate_and_correct_json(state.cv_summary, json_str)

                if validation["valid"]:
                    candidate_data = validation["data"]
                    state.reset()
                    return {
                        "response": "✅ CV evaluation complete! All information collected.",
                        "candidate_data": candidate_data,
                        "status": "complete"
                    }

            state.add_message("assistant", evaluation["message"])
            return {
                "response": "📝 We found your CV! Please fill in the missing details below.",
                "missing_fields": evaluation.get("missing_fields", []),
                "status": "needs_fields"
            }

        # ─── FLAG = TRUE → waiting for form submission ───
        return {
            "response": "📝 Please fill in the form to complete your CV submission.",
            "status": "awaiting_fields"
        }

    @staticmethod
    async def submit_fields(state: CVEvalState, fields: Dict[str, str]) -> Dict[str, Any]:
        """
        Handle form field submission. Converts to JSON and returns candidate data.
        """
        if not state.flag:
            return {
                "response": "⚠️ No CV being processed. Please upload a CV first.",
                "status": "error"
            }

        # Append fields to summary
        state.append_fields(fields)

        # Convert to JSON directly (skip re-evaluation — form means all info provided)
        json_str = await cv_to_json(state.cv_summary)
        validation = await validate_and_correct_json(state.cv_summary, json_str)

        if validation["valid"]:
            candidate_data = validation["data"]
            state.reset()
            return {
                "response": "✅ Thank you! CV evaluation completed successfully.",
                "candidate_data": candidate_data,
                "status": "complete"
            }
        else:
            state.reset()
            return {
                "response": "⚠️ CV processing completed with warnings. Data saved for review.",
                "raw_data": validation.get("raw_response"),
                "status": "partial"
            }
