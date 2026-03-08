"""
Requirement Model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Requirement(Base):
    __tablename__ = "requirements"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)

    # Job Details
    job_title = Column(String(255), nullable=False, index=True)
    job_description = Column(Text, nullable=False)
    required_skills = Column(Text, nullable=True)  # JSON array as text
    preferred_skills = Column(Text, nullable=True)  # JSON array as text
    experience_level = Column(String(50), nullable=True)  # junior, mid, senior, lead
    location = Column(String(255), nullable=True)
    remote_type = Column(String(50), default="hybrid")  # remote, hybrid, onsite
    salary_range = Column(String(100), nullable=True)

    # Extended Details (from old app)
    company_name = Column(String(255), nullable=True)  # Client/company for this role
    role_title = Column(String(255), nullable=True)  # Specific role title if different from job_title
    facilities = Column(Text, nullable=True)  # Benefits: accommodation, transport, etc.
    pay_type = Column(String(50), nullable=True)  # monthly, hourly, annual, etc.
    notes = Column(Text, nullable=True)  # Internal notes

    # AI-Parsed Data
    raw_text = Column(Text, nullable=True)  # Original pasted text for AI parsing
    structured_data = Column(Text, nullable=True)  # AI-extracted JSON

    # Status
    status = Column(String(50), default="open", index=True)  # open, in_progress, filled, closed
    priority = Column(String(50), default="medium")  # low, medium, high, urgent
    positions_count = Column(Integer, default=1)
    positions_filled = Column(Integer, default=0)

    # Matching
    ai_matching_enabled = Column(Boolean, default=True)
    matching_criteria = Column(Text, nullable=True)  # JSON

    # Metadata
    created_by_user_id = Column(Integer, nullable=True)  # Reference to client_users
    assigned_to_user_id = Column(Integer, ForeignKey("client_users.id", ondelete="SET NULL"), nullable=True, index=True)
    deadline = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    client = relationship("Client", back_populates="requirements")
    applicants = relationship("Applicant", back_populates="requirement")
    assigned_user = relationship("ClientUser", back_populates="assigned_requirements", foreign_keys=[assigned_to_user_id])

    def __repr__(self):
        return f"<Requirement(id={self.id}, title='{self.job_title}', status='{self.status}')>"
