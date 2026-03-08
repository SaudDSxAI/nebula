"""
Super Admin Model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index
from app.database import Base


class SuperAdmin(Base):
    __tablename__ = "super_admins"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(String(50), default="super_admin")

    # Security
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255), nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True, index=True)

    def __repr__(self):
        return f"<SuperAdmin(id={self.id}, email='{self.email}', name='{self.name}')>"
