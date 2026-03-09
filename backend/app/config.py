"""
Application Configuration
Environment variables and settings
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings from environment variables"""

    # App Info
    APP_NAME: str = "TRM Platform"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/trm_platform"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    # Security
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"  # MUST change in production
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_HOURS: int = 168  # 7 days for dev convenience
    JWT_REFRESH_TOKEN_EXPIRE_HOURS: int = 720  # 30 days for dev convenience
    JWT_ABSOLUTE_TIMEOUT_HOURS: int = 720  # 30 days for dev convenience

    # Password Hashing
    PASSWORD_HASH_ROUNDS: int = 12

    # Session
    SESSION_TIMEOUT_MINUTES: int = 10080  # 7 days for dev convenience
    SESSION_ABSOLUTE_TIMEOUT_MINUTES: int = 43200  # 30 days for dev convenience

    # Rate Limiting
    RATE_LIMIT_LOGIN: str = "5/hour"  # 5 attempts per hour
    RATE_LIMIT_API: str = "100/minute"  # 100 requests per minute
    RATE_LIMIT_AI_CHAT: str = "10/5minutes"  # 10 messages per 5 minutes

    # AI Services
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4-turbo"
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_MAX_TOKENS: int = 2000

    # Vector Database (Pinecone)
    PINECONE_API_KEY: Optional[str] = None
    PINECONE_ENVIRONMENT: Optional[str] = None
    PINECONE_INDEX_NAME: str = "trm-knowledge-base"

    # Cloudflare R2 Storage
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "nebula"
    R2_PUBLIC_URL: str = ""  # Public access URL if bucket is public
    ALLOWED_CV_EXTENSIONS: list = [".pdf", ".docx", ".doc"]

    # Email (placeholder for future)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@trmplatform.com"
    SMTP_FROM_NAME: str = "TRM Platform"
    EMAIL_ENABLED: bool = False

    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


# Create settings instance
settings = Settings()

if settings.DATABASE_URL and settings.DATABASE_URL.startswith("postgresql://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
