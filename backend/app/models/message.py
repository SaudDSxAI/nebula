"""
Message Model — Admin-Candidate communication
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Foreign Keys
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)

    # Message Content
    sender_type = Column(String(20), nullable=False)  # 'admin' or 'candidate'
    sender_id = Column(Integer, nullable=True)  # user ID (ClientUser.id or Candidate.id)
    sender_name = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)

    # Status
    is_read = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Indexes
    __table_args__ = (
        Index("idx_messages_candidate_client", "candidate_id", "client_id"),
    )

    def __repr__(self):
        return f"<Message(id={self.id}, sender_type='{self.sender_type}', candidate_id={self.candidate_id})>"
