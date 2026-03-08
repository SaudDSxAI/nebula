"""
Session Management Utilities
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.auth import Session
from app.config import settings


async def create_session(
    db: AsyncSession,
    user_id: int,
    user_type: str,
    user_email: str,
    access_token: str,
    refresh_token: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    device_type: Optional[str] = None
) -> Session:
    """
    Create a new session record in the database

    Args:
        db: Database session
        user_id: User ID
        user_type: Type of user (super_admin, client, client_user)
        user_email: User email
        access_token: JWT access token
        refresh_token: JWT refresh token
        ip_address: Optional IP address
        user_agent: Optional user agent string
        device_type: Optional device type

    Returns:
        Created session object
    """
    expires_at = datetime.utcnow() + timedelta(hours=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS)

    session = Session(
        session_token=access_token,
        refresh_token=refresh_token,
        user_id=user_id,
        user_type=user_type,
        user_email=user_email,
        ip_address=ip_address,
        user_agent=user_agent,
        device_type=device_type,
        is_active=True,
        expires_at=expires_at,
        last_activity=datetime.utcnow()
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    return session


async def get_session_by_token(
    db: AsyncSession,
    session_token: str
) -> Optional[Session]:
    """
    Get a session by its token

    Args:
        db: Database session
        session_token: Session token to look up

    Returns:
        Session object if found and active, None otherwise
    """
    result = await db.execute(
        select(Session).where(
            Session.session_token == session_token,
            Session.is_active == True,
            Session.revoked_at.is_(None)
        )
    )

    session = result.scalar_one_or_none()

    # Check if session is expired
    if session and session.expires_at < datetime.utcnow():
        session.is_active = False
        await db.commit()
        return None

    return session


async def update_session_activity(
    db: AsyncSession,
    session_token: str
) -> bool:
    """
    Update the last activity timestamp of a session

    Args:
        db: Database session
        session_token: Session token

    Returns:
        True if updated, False if session not found
    """
    result = await db.execute(
        select(Session).where(
            Session.session_token == session_token,
            Session.is_active == True
        )
    )

    session = result.scalar_one_or_none()

    if session:
        session.last_activity = datetime.utcnow()
        await db.commit()
        return True

    return False


async def revoke_session(
    db: AsyncSession,
    session_token: str
) -> bool:
    """
    Revoke/logout a session

    Args:
        db: Database session
        session_token: Session token to revoke

    Returns:
        True if revoked, False if session not found
    """
    result = await db.execute(
        select(Session).where(Session.session_token == session_token)
    )

    session = result.scalar_one_or_none()

    if session:
        session.is_active = False
        session.revoked_at = datetime.utcnow()
        await db.commit()
        return True

    return False


async def revoke_all_user_sessions(
    db: AsyncSession,
    user_id: int,
    user_type: str
) -> int:
    """
    Revoke all active sessions for a user

    Args:
        db: Database session
        user_id: User ID
        user_type: User type

    Returns:
        Number of sessions revoked
    """
    result = await db.execute(
        select(Session).where(
            Session.user_id == user_id,
            Session.user_type == user_type,
            Session.is_active == True
        )
    )

    sessions = result.scalars().all()

    for session in sessions:
        session.is_active = False
        session.revoked_at = datetime.utcnow()

    await db.commit()

    return len(sessions)


async def cleanup_expired_sessions(db: AsyncSession) -> int:
    """
    Delete expired sessions from the database

    Args:
        db: Database session

    Returns:
        Number of sessions deleted
    """
    result = await db.execute(
        delete(Session).where(
            Session.expires_at < datetime.utcnow()
        )
    )

    await db.commit()

    return result.rowcount


async def get_active_sessions_count(
    db: AsyncSession,
    user_id: int,
    user_type: str
) -> int:
    """
    Get the number of active sessions for a user

    Args:
        db: Database session
        user_id: User ID
        user_type: User type

    Returns:
        Number of active sessions
    """
    result = await db.execute(
        select(Session).where(
            Session.user_id == user_id,
            Session.user_type == user_type,
            Session.is_active == True,
            Session.expires_at > datetime.utcnow()
        )
    )

    sessions = result.scalars().all()

    return len(sessions)
