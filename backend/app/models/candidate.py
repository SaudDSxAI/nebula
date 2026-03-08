"""
Candidate Models (candidates, applicants, talent_pool)
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)

    # Personal Info
    email = Column(String(255), nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    name = Column(String(255), nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(50), nullable=True)
    nationality = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)

    # Professional Info
    current_title = Column(String(255), nullable=True)
    current_company = Column(String(255), nullable=True)
    years_of_experience = Column(Integer, nullable=True)
    skills = Column(Text, nullable=True)  # JSON array
    education = Column(Text, nullable=True)  # JSON
    certifications = Column(Text, nullable=True)  # JSON

    # Preferences
    desired_role = Column(String(255), nullable=True)
    desired_location = Column(String(255), nullable=True)
    remote_preference = Column(String(50), nullable=True)   # remote, hybrid, onsite
    salary_expectation = Column(String(100), nullable=True)
    availability = Column(String(50), nullable=True)        # immediate, 2_weeks, 1_month, 3_months
    notice_period = Column(String(100), nullable=True)      # Immediate, 2 weeks, 30 days, 90 days
    work_authorization = Column(String(100), nullable=True) # Citizen, PR, Work Visa, Needs Sponsorship
    employment_status = Column(String(100), nullable=True)  # Employed, Unemployed
    willing_to_relocate = Column(String(50), nullable=True)
    languages = Column(Text, nullable=True)                 # JSON array ["English", "Arabic"]
    tags = Column(Text, nullable=True)                      # JSON array ["React Expert", "Top Performer"]
    extra_data = Column(JSON, nullable=True)                # Catch-all for unrecognised screening fields

    # AI & Matching
    ai_summary = Column(Text, nullable=True)
    ai_skills_extracted = Column(Text, nullable=True)  # JSON

    # Source
    source = Column(String(100), nullable=True)  # direct_application, referral, imported, linkedin, etc.
    referrer_id = Column(Integer, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)

    # Compliance
    gdpr_consent = Column(Boolean, default=False)
    gdpr_consent_date = Column(DateTime, nullable=True)
    data_retention_until = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_contacted = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    client = relationship("Client", back_populates="candidates")
    applications = relationship("Applicant", back_populates="candidate")
    cv_uploads = relationship("CVUpload", back_populates="candidate")

    def __repr__(self):
        return f"<Candidate(id={self.id}, name='{self.name}', email='{self.email}')>"


class Applicant(Base):
    __tablename__ = "applicants"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Foreign Keys
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)

    # Application Details
    status = Column(String(50), default="applied", index=True)
    # Statuses: applied, screening, interviewing, offered, accepted, rejected, withdrawn

    cover_letter = Column(Text, nullable=True)
    application_source = Column(String(100), nullable=True)  # career_page, referral, direct, etc.

    # AI Matching
    ai_match_score = Column(String(10), nullable=True)
    ai_match_reasons = Column(Text, nullable=True)  # JSON

    # Interview Process (JSON)
    interview_stages = Column(JSON, nullable=True)
    current_stage = Column(String(100), nullable=True)

    # Feedback
    internal_notes = Column(Text, nullable=True)
    rejection_reason = Column(String(255), nullable=True)

    # Timestamps
    applied_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status_changed_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    candidate = relationship("Candidate", back_populates="applications")
    requirement = relationship("Requirement", back_populates="applicants")

    def __repr__(self):
        return f"<Applicant(id={self.id}, candidate_id={self.candidate_id}, status='{self.status}')>"


class TalentPool(Base):
    __tablename__ = "talent_pool"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)

    # Pool Details
    pool_name = Column(String(255), nullable=False)  # e.g., "Senior Developers", "Marketing Experts"
    tags = Column(Text, nullable=True)  # JSON array
    notes = Column(Text, nullable=True)
    priority = Column(String(50), default="medium")  # low, medium, high

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    added_at = Column(DateTime, default=datetime.utcnow)
    added_by_user_id = Column(Integer, nullable=True)
    last_contacted = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<TalentPool(id={self.id}, pool='{self.pool_name}', candidate_id={self.candidate_id})>"
