"""
SQLAlchemy Models for TRM Platform
"""
from app.models.super_admin import SuperAdmin
from app.models.client import Client, ClientUser, ClientSettings
from app.models.requirement import Requirement
from app.models.candidate import Candidate, Applicant, TalentPool
from app.models.cv import CVUpload
from app.models.message import Message
from app.models.ai import AIInteraction
from app.models.analytics import AnalyticsEvent
from app.models.auth import Session, PasswordResetToken
from app.models.activity import ActivityLog
from app.models.rate_limit import RateLimit

__all__ = [
    "SuperAdmin",
    "Client",
    "ClientUser",
    "ClientSettings",
    "Requirement",
    "Candidate",
    "Applicant",
    "TalentPool",
    "CVUpload",
    "Message",
    "AIInteraction",
    "AnalyticsEvent",
    "Session",
    "PasswordResetToken",
    "ActivityLog",
    "RateLimit",
]
