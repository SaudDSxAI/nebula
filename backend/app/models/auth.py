"""
Authentication Models (sessions, password_reset_tokens)
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Index
from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Session Token
    session_token = Column(String(500), unique=True, nullable=False, index=True)
    refresh_token = Column(String(500), unique=True, nullable=True)

    # User Context
    user_id = Column(Integer, nullable=False, index=True)
    user_type = Column(String(50), nullable=False)  # super_admin, client, client_user
    user_email = Column(String(255), nullable=False)

    # Device Info
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    device_type = Column(String(50), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)
    last_activity = Column(DateTime, default=datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<Session(id={self.id}, user_type='{self.user_type}', user_id={self.user_id})>"


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Token
    token = Column(String(500), unique=True, nullable=False, index=True)

    # User Context
    user_id = Column(Integer, nullable=False, index=True)
    user_type = Column(String(50), nullable=False)  # super_admin, client, client_user
    user_email = Column(String(255), nullable=False, index=True)

    # Status
    is_used = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)
    used_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<PasswordResetToken(id={self.id}, email='{self.user_email}', used={self.is_used})>"
