"""
CV Upload Model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class CVUpload(Base):
    __tablename__ = "cv_uploads"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)

    # File Info
    original_filename = Column(String(500), nullable=False)
    stored_filename = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)  # in bytes
    file_type = Column(String(50), nullable=True)  # pdf, docx, doc, txt
    storage_path = Column(String(1000), nullable=False)  # R2 object key or legacy local path

    # Parsing
    parsed_text = Column(Text, nullable=True)
    parsing_status = Column(String(50), default="pending")  # pending, processing, completed, failed
    parsing_error = Column(Text, nullable=True)

    # AI Extraction
    ai_extracted_data = Column(Text, nullable=True)  # JSON with skills, experience, education, etc.
    ai_summary = Column(Text, nullable=True)

    # Version Control
    version = Column(Integer, default=1)
    is_latest = Column(Boolean, default=True)

    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow, index=True)
    parsed_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    candidate = relationship("Candidate", back_populates="cv_uploads")

    def __repr__(self):
        return f"<CVUpload(id={self.id}, filename='{self.original_filename}', status='{self.parsing_status}')>"
