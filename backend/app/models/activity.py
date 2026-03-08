"""
Activity Log Model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # User Context
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    user_type = Column(String(50), nullable=True)  # super_admin, client, client_user
    user_email = Column(String(255), nullable=True)

    # Activity Details
    action = Column(String(100), nullable=False, index=True)
    # Actions: create, update, delete, login, logout, view, export, etc.

    entity_type = Column(String(100), nullable=True, index=True)
    # Entities: client, requirement, candidate, applicant, cv_upload, etc.

    entity_id = Column(Integer, nullable=True)

    description = Column(Text, nullable=False)

    # Changes (JSON) - for tracking what changed
    changes = Column(Text, nullable=True)

    # Request Info
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<ActivityLog(id={self.id}, action='{self.action}', entity='{self.entity_type}')>"
