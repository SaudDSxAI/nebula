"""
Rate Limit Model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index
from app.database import Base


class RateLimit(Base):
    __tablename__ = "rate_limits"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Identifier
    identifier = Column(String(255), nullable=False, index=True)
    # Can be: IP address, API key, user email, user_id, etc.

    identifier_type = Column(String(50), nullable=False)  # ip, api_key, user_email, user_id

    # Rate Limit Details
    endpoint = Column(String(255), nullable=True, index=True)  # Specific endpoint being rate limited
    action = Column(String(100), nullable=True)  # login, api_call, export, etc.

    # Counters
    request_count = Column(Integer, default=1)

    # Time Window
    window_start = Column(DateTime, default=datetime.utcnow, index=True)
    window_end = Column(DateTime, nullable=False)

    # Status
    is_blocked = Column(Boolean, default=False)
    blocked_until = Column(DateTime, nullable=True)

    # Timestamps
    first_request_at = Column(DateTime, default=datetime.utcnow)
    last_request_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<RateLimit(id={self.id}, identifier='{self.identifier}', count={self.request_count})>"
