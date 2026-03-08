"""
Client Models (clients, client_users, client_settings)
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Client(Base):
    __tablename__ = "clients"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    # Company Info
    company_name = Column(String(255), unique=True, nullable=False, index=True)
    unique_subdomain = Column(String(100), unique=True, nullable=True)
    logo_url = Column(String(500), nullable=True)
    website = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)

    # Company Data (for AI Assistant knowledge base)
    company_description = Column(Text, nullable=True)
    company_data = Column(Text, nullable=True)  # Extended text for RAG embeddings
    industry = Column(String(100), nullable=True)
    team_size = Column(String(50), nullable=True)
    headquarters = Column(String(255), nullable=True)
    benefits = Column(Text, nullable=True)

    # Portal Customisation (candidate-facing landing page)
    portal_headline = Column(String(255), nullable=True)   # Hero headline text
    portal_tagline = Column(String(500), nullable=True)    # Sub-headline / tagline
    portal_contact_email = Column(String(255), nullable=True)  # Contact email shown on portal
    # Portal stats (3 configurable stats shown on landing page)
    portal_stat1_num = Column(String(50), nullable=True, default='500+')
    portal_stat1_label = Column(String(100), nullable=True, default='PLACEMENTS')
    portal_stat2_num = Column(String(50), nullable=True, default='AI')
    portal_stat2_label = Column(String(100), nullable=True, default='POWERED')
    portal_stat3_num = Column(String(50), nullable=True, default='24/7')
    portal_stat3_label = Column(String(100), nullable=True, default='ACCESS')
    # Logo display adjustments (zoom/pan)
    logo_scale = Column(String(10), nullable=True, default='1')      # e.g. "1.5" = 150%
    logo_offset_x = Column(Integer, nullable=True, default=0)        # px offset X
    logo_offset_y = Column(Integer, nullable=True, default=0)        # px offset Y


    # Plan & Status
    plan = Column(String(50), default="free", index=True)  # free, professional, enterprise
    status = Column(String(50), default="active", index=True)  # active, inactive, suspended

    # API Access
    api_key = Column(String(255), unique=True, nullable=True, index=True)
    api_key_created_at = Column(DateTime, nullable=True)

    # Security
    email_verified = Column(Boolean, default=False)
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255), nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)

    # Compliance
    gdpr_consent = Column(Boolean, default=False)
    gdpr_consent_date = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    users = relationship("ClientUser", back_populates="client", cascade="all, delete-orphan")
    settings = relationship("ClientSettings", back_populates="client", uselist=False, cascade="all, delete-orphan")
    requirements = relationship("Requirement", back_populates="client")
    candidates = relationship("Candidate", back_populates="client")

    def __repr__(self):
        return f"<Client(id={self.id}, company='{self.company_name}', plan='{self.plan}')>"


class ClientUser(Base):
    __tablename__ = "client_users"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)

    # User Info
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), default="member")  # admin, member, viewer

    # Permissions (JSON)
    permissions = Column(JSON, nullable=True)

    # Security
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255), nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    client = relationship("Client", back_populates="users")
    assigned_requirements = relationship("Requirement", back_populates="assigned_user", foreign_keys="Requirement.assigned_to_user_id")

    def __repr__(self):
        return f"<ClientUser(id={self.id}, email='{self.email}', role='{self.role}')>"


class ClientSettings(Base):
    __tablename__ = "client_settings"

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True)

    # AI Assistant Settings
    ai_assistant_enabled = Column(Boolean, default=True)
    ai_model = Column(String(100), default="gpt-4-turbo")
    ai_temperature = Column(String(10), default="0.7")
    custom_ai_instructions = Column(Text, nullable=True)

    # CV Parsing Settings
    cv_parsing_enabled = Column(Boolean, default=True)
    cv_parsing_auto = Column(Boolean, default=False)
    cv_parsing_language = Column(String(10), default="en")
    evaluator_prompt = Column(Text, nullable=True)       # Custom CV evaluator prompt; None = use default
    evaluator_fields = Column(JSON, nullable=True)       # Visual field builder result (list of field dicts)


    # Notification Settings
    email_notifications = Column(Boolean, default=True)
    weekly_digest = Column(Boolean, default=True)
    notification_email = Column(String(255), nullable=True)

    # Branding
    primary_color = Column(String(7), default="#3B82F6")
    secondary_color = Column(String(7), default="#10B981")
    custom_css = Column(Text, nullable=True)

    # Features (JSON)
    enabled_features = Column(JSON, nullable=True)
    feature_limits = Column(JSON, nullable=True)

    # Data Retention (days)
    data_retention_days = Column(Integer, default=730)  # 2 years

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="settings")

    def __repr__(self):
        return f"<ClientSettings(id={self.id}, client_id={self.client_id})>"
