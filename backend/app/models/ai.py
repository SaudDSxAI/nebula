"""
AI Interaction Model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from app.database import Base


class AIInteraction(Base):
    __tablename__ = "ai_interactions"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # User Context
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, nullable=True)  # client_users.id
    user_type = Column(String(50), nullable=True)  # super_admin, client, client_user

    # Interaction Details
    interaction_type = Column(String(100), nullable=False, index=True)
    # Types: cv_parsing, candidate_matching, chat, suggestion, analysis, etc.

    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)

    # AI Model Info
    model_used = Column(String(100), nullable=True)  # gpt-4-turbo, gpt-3.5-turbo, etc.
    tokens_used = Column(Integer, nullable=True)
    cost = Column(String(20), nullable=True)  # in USD

    # Context (JSON)
    context_data = Column(Text, nullable=True)  # Additional metadata

    # Performance
    response_time_ms = Column(Integer, nullable=True)

    # Status
    status = Column(String(50), default="success")  # success, error, timeout
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<AIInteraction(id={self.id}, type='{self.interaction_type}', status='{self.status}')>"
