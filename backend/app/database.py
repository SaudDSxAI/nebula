"""
Database configuration and session management
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
)

# Create async session maker
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Create declarative base for models
Base = declarative_base()


async def get_db():
    """Dependency for getting database sessions"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database - create all tables and run migrations"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized successfully")

    # Run safe column migrations (add missing columns)
    async with engine.begin() as conn:
        try:
            text = __import__('sqlalchemy').text
            await conn.execute(
                text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)")
            )
            await conn.execute(
                text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS notice_period VARCHAR(100)")
            )
            await conn.execute(
                text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS work_authorization VARCHAR(100)")
            )
            await conn.execute(
                text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS languages TEXT")
            )
            await conn.execute(
                text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS tags TEXT")
            )
            logger.info("Migration: candidates columns ensured (password_hash, notice_period, work_authorization, languages, tags)")
            # Ensure messages table exists
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
                    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                    sender_type VARCHAR(20) NOT NULL,
                    sender_id INTEGER,
                    sender_name VARCHAR(255),
                    message TEXT NOT NULL,
                    is_read BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_messages_candidate_client ON messages(candidate_id, client_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)"))
            logger.info("Migration: messages table ensured")
            # Ensure new requirement columns exist
            for col, ctype in [
                ("company_name", "VARCHAR(255)"), ("role_title", "VARCHAR(255)"),
                ("facilities", "TEXT"), ("pay_type", "VARCHAR(50)"),
                ("notes", "TEXT"), ("raw_text", "TEXT"), ("structured_data", "TEXT"),
            ]:
                await conn.execute(text(f"ALTER TABLE requirements ADD COLUMN IF NOT EXISTS {col} {ctype}"))
            logger.info("Migration: requirements extended columns ensured")

            # Ensure new client columns exist
            for col, ctype in [
                ("company_description", "TEXT"), ("company_data", "TEXT"),
                ("industry", "VARCHAR(255)"), ("team_size", "VARCHAR(100)"), ("headquarters", "VARCHAR(255)"), 
                ("benefits", "TEXT"), ("portal_headline", "VARCHAR(255)"), ("portal_tagline", "VARCHAR(255)"), 
                ("portal_contact_email", "VARCHAR(255)"), ("portal_stat1_num", "VARCHAR(50)"), ("portal_stat1_label", "VARCHAR(255)"),
                ("portal_stat2_num", "VARCHAR(50)"), ("portal_stat2_label", "VARCHAR(255)"), ("portal_stat3_num", "VARCHAR(50)"), ("portal_stat3_label", "VARCHAR(255)"),
                ("logo_scale", "FLOAT"), ("logo_offset_x", "FLOAT"), ("logo_offset_y", "FLOAT"),
                ("gdpr_consent", "BOOLEAN"), ("gdpr_consent_date", "TIMESTAMP")
            ]:
                await conn.execute(text(f"ALTER TABLE clients ADD COLUMN IF NOT EXISTS {col} {ctype}"))
            
            # Fix incorrectly added JSONB columns
            await conn.execute(text("ALTER TABLE clients ALTER COLUMN company_data TYPE TEXT USING company_data::text"))
            await conn.execute(text("ALTER TABLE clients ALTER COLUMN benefits TYPE TEXT USING benefits::text"))

            logger.info("Migration: clients extended columns ensured")
            
            # Ensure new client_settings columns exist
            for col, ctype in [
                ("evaluator_prompt", "TEXT"),
                ("evaluator_fields", "JSONB")
            ]:
                await conn.execute(text(f"ALTER TABLE client_settings ADD COLUMN IF NOT EXISTS {col} {ctype}"))
            logger.info("Migration: client_settings extended columns ensured")

            # Ensure new client_users columns exist
            for col, ctype in [
                ("permissions", "JSONB")
            ]:
                await conn.execute(text(f"ALTER TABLE client_users ADD COLUMN IF NOT EXISTS {col} {ctype}"))
            logger.info("Migration: client_users extended columns ensured")
            
        except Exception as e:
            logger.warning(f"Migration note: {e}")


async def close_db():
    """Close database connections"""
    await engine.dispose()
    logger.info("Database connections closed")
