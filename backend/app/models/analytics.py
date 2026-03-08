"""
Analytics Event Model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from app.database import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # User Context
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, nullable=True)  # References client_users or super_admins
    user_type = Column(String(50), nullable=True, index=True)  # super_admin, client, client_user, candidate

    # Event Details
    event_type = Column(String(100), nullable=False, index=True)
    # Types: login, logout, page_view, button_click, form_submit,
    #        candidate_view, requirement_create, cv_upload, ai_query, etc.

    event_category = Column(String(100), nullable=True)  # authentication, navigation, action, etc.
    event_label = Column(String(255), nullable=True)

    # Page/Route Info
    page_url = Column(String(1000), nullable=True)
    page_title = Column(String(255), nullable=True)
    referrer = Column(String(1000), nullable=True)

    # Technical Details
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    device_type = Column(String(50), nullable=True)  # desktop, mobile, tablet
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)

    # Custom Data (JSON)
    event_metadata = Column("metadata", Text, nullable=True)  # Use 'metadata' as DB column name

    # Session
    session_id = Column(String(255), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<AnalyticsEvent(id={self.id}, type='{self.event_type}', user_type='{self.user_type}')>"
