"""
Client Portal Schemas - Pydantic models for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ========================
# CLIENT AUTH SCHEMAS
# ========================

class ClientSignupRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)
    plan: str = Field(default="trial", pattern="^(free|trial|professional|enterprise)$")
    website: Optional[str] = None
    phone: Optional[str] = None


class ClientLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class ClientAuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    client: dict


# ========================
# REQUIREMENT SCHEMAS
# ========================

class RequirementCreateRequest(BaseModel):
    job_title: str = Field(..., min_length=2, max_length=255)
    job_description: str = Field(..., min_length=10)
    required_skills: Optional[str] = None  # comma-separated or JSON
    preferred_skills: Optional[str] = None
    experience_level: Optional[str] = None  # free text: '5+ years', 'senior', etc.
    location: Optional[str] = None
    remote_type: str = Field(default="hybrid", pattern="^(remote|hybrid|onsite)$")
    salary_range: Optional[str] = None
    priority: str = Field(default="medium", pattern="^(low|medium|high|urgent)$")
    positions_count: int = Field(default=1, ge=1)
    deadline: Optional[datetime] = None
    # Extended fields (from old app)
    company_name: Optional[str] = None
    role_title: Optional[str] = None
    facilities: Optional[str] = None
    pay_type: Optional[str] = None
    notes: Optional[str] = None


class AIRequirementCreateRequest(BaseModel):
    raw_text: str = Field(..., min_length=10, max_length=10000)


class RequirementUpdateRequest(BaseModel):
    job_title: Optional[str] = Field(None, min_length=2, max_length=255)
    job_description: Optional[str] = Field(None, min_length=10)
    required_skills: Optional[str] = None
    preferred_skills: Optional[str] = None
    experience_level: Optional[str] = None  # free text: '5+ years', 'senior', etc.
    location: Optional[str] = None
    remote_type: Optional[str] = Field(None, pattern="^(remote|hybrid|onsite)$")
    salary_range: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(open|in_progress|filled|closed)$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|urgent)$")
    positions_count: Optional[int] = Field(None, ge=1)
    deadline: Optional[datetime] = None
    company_name: Optional[str] = None
    role_title: Optional[str] = None
    facilities: Optional[str] = None
    pay_type: Optional[str] = None
    notes: Optional[str] = None


class RequirementResponse(BaseModel):
    id: int
    client_id: int
    job_title: str
    job_description: str
    required_skills: Optional[str] = None
    preferred_skills: Optional[str] = None
    experience_level: Optional[str] = None
    location: Optional[str] = None
    remote_type: str
    salary_range: Optional[str] = None
    status: str
    priority: str
    positions_count: int
    positions_filled: int
    deadline: Optional[datetime] = None
    applicants_count: Optional[int] = 0
    assigned_to_user_id: Optional[int] = None
    assigned_user: Optional[dict] = None
    company_name: Optional[str] = None
    role_title: Optional[str] = None
    facilities: Optional[str] = None
    pay_type: Optional[str] = None
    notes: Optional[str] = None
    raw_text: Optional[str] = None
    structured_data: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RequirementListResponse(BaseModel):
    requirements: List[RequirementResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ========================
# CANDIDATE SCHEMAS
# ========================

class CandidateResponse(BaseModel):
    id: int
    client_id: int
    email: str
    name: str
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    years_of_experience: Optional[int] = None
    skills: Optional[str] = None
    education: Optional[str] = None
    desired_role: Optional[str] = None
    desired_location: Optional[str] = None
    salary_expectation: Optional[str] = None
    availability: Optional[str] = None
    notice_period: Optional[str] = None
    work_authorization: Optional[str] = None
    languages: Optional[str] = None
    source: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CandidateDetailResponse(CandidateResponse):
    applications: Optional[List[dict]] = []
    ai_summary: Optional[str] = None
    certifications: Optional[str] = None
    cv_url: Optional[str] = None
    cv_parsed_text: Optional[str] = None


class CandidateListResponse(BaseModel):
    candidates: List[CandidateResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CandidateStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(applied|screening|interviewing|offered|accepted|rejected|withdrawn)$")
    note: Optional[str] = None


class CandidateNoteRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


# ========================
# APPLICANT SCHEMAS
# ========================

class ApplicantResponse(BaseModel):
    id: int
    candidate_id: int
    requirement_id: int
    status: str
    cover_letter: Optional[str] = None
    ai_match_score: Optional[str] = None
    applied_at: datetime
    updated_at: datetime
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    requirement_title: Optional[str] = None

    class Config:
        from_attributes = True


# ========================
# CLIENT DASHBOARD SCHEMAS
# ========================

class DashboardOverviewResponse(BaseModel):
    total_requirements: int
    active_requirements: int
    total_candidates: int
    total_applications: int
    applications_this_week: int
    candidates_by_status: dict
    recent_applications: List[dict]


class RequirementStatsResponse(BaseModel):
    requirements: List[dict]
    total: int


class CandidateStatsResponse(BaseModel):
    new_per_week: List[dict]
    status_funnel: dict
    top_skills: List[dict]
    total_candidates: int
