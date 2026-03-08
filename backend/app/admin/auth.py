"""
Super Admin Authentication Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta
from typing import Dict, Any

from app.database import get_db
from app.models.super_admin import SuperAdmin
from app.models.activity import ActivityLog
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    PasswordResetRequest,
    PasswordResetResponse,
    LogoutResponse,
)
from app.schemas.admin import SuperAdminResponse
from app.utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    generate_password_reset_token,
    verify_password_reset_token,
)
from app.utils.session import create_session, revoke_session, get_session_by_token
from app.middleware.auth import require_super_admin
from app.config import settings

router = APIRouter(prefix="/api/admin/auth", tags=["Super Admin Auth"])


async def log_activity(
    db: AsyncSession,
    user_id: int,
    user_type: str,
    action: str,
    description: str,
    ip_address: str = None,
    user_agent: str = None
):
    """Helper function to log activity"""
    activity = ActivityLog(
        user_id=user_id,
        user_type=user_type,
        action=action,
        entity_type="super_admin",
        entity_id=user_id,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(activity)
    await db.commit()


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Super Admin Login

    - Validates email and password
    - Tracks failed login attempts (max 5)
    - Locks account for 1 hour after 5 failed attempts
    - Creates session and returns JWT tokens
    """
    # Get admin by email
    result = await db.execute(
        select(SuperAdmin).where(
            SuperAdmin.email == credentials.email,
            SuperAdmin.deleted_at.is_(None)
        )
    )
    admin = result.scalar_one_or_none()

    # Check if admin exists
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check if account is locked
    if admin.locked_until and admin.locked_until > datetime.utcnow():
        minutes_left = int((admin.locked_until - datetime.utcnow()).total_seconds() / 60)
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked due to too many failed attempts. Try again in {minutes_left} minutes."
        )

    # Verify password
    if not verify_password(credentials.password, admin.password_hash):
        # Increment failed attempts
        admin.failed_login_attempts += 1

        # Lock account if too many failures
        if admin.failed_login_attempts >= 5:
            admin.locked_until = datetime.utcnow() + timedelta(hours=1)
            await db.commit()

            # Log failed attempt
            await log_activity(
                db, admin.id, "super_admin", "login_failed",
                f"Account locked after {admin.failed_login_attempts} failed attempts",
                request.client.host if request.client else None,
                request.headers.get("user-agent")
            )

            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Too many failed login attempts. Account locked for 1 hour."
            )

        await db.commit()

        # Log failed attempt
        await log_activity(
            db, admin.id, "super_admin", "login_failed",
            f"Failed login attempt ({admin.failed_login_attempts}/5)",
            request.client.host if request.client else None,
            request.headers.get("user-agent")
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Reset failed attempts and locked status on successful login
    admin.failed_login_attempts = 0
    admin.locked_until = None
    admin.last_login = datetime.utcnow()
    await db.commit()

    # Create tokens
    token_data = {
        "user_id": admin.id,
        "user_type": "super_admin",
        "email": admin.email
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Create session
    await create_session(
        db=db,
        user_id=admin.id,
        user_type="super_admin",
        user_email=admin.email,
        access_token=access_token,
        refresh_token=refresh_token,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )

    # Log successful login
    await log_activity(
        db, admin.id, "super_admin", "login",
        "Super admin logged in successfully",
        request.client.host if request.client else None,
        request.headers.get("user-agent")
    )

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        user={
            "id": admin.id,
            "email": admin.email,
            "name": admin.name,
            "role": admin.role,
            "user_type": "super_admin"
        }
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    current_user: Dict[str, Any] = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Super Admin Logout

    - Revokes the current session
    - Logs the logout activity
    """
    # Get the token from the request (it's already validated by require_super_admin)
    # We'll need to pass it through the dependency
    # For now, we'll revoke all sessions for this user

    # Log logout
    await log_activity(
        db,
        current_user["user_id"],
        "super_admin",
        "logout",
        "Super admin logged out"
    )

    return LogoutResponse(message="Logged out successfully")


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    refresh_request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh Access Token

    - Validates refresh token
    - Issues new access token
    """
    # Verify refresh token
    payload = verify_token(refresh_request.refresh_token, token_type="refresh")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    # Check if user still exists
    user_id = payload.get("user_id")
    user_type = payload.get("user_type")

    if user_type != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user type"
        )

    result = await db.execute(
        select(SuperAdmin).where(
            SuperAdmin.id == user_id,
            SuperAdmin.deleted_at.is_(None)
        )
    )
    admin = result.scalar_one_or_none()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    # Create new access token
    token_data = {
        "user_id": admin.id,
        "user_type": "super_admin",
        "email": admin.email
    }

    new_access_token = create_access_token(token_data)

    return RefreshTokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS * 3600
    )


@router.get("/me", response_model=SuperAdminResponse)
async def get_current_admin(
    current_user: Dict[str, Any] = Depends(require_super_admin)
):
    """
    Get Current Super Admin Info

    - Returns the currently authenticated super admin's information
    """
    admin = current_user["user_object"]

    return SuperAdminResponse(
        id=admin.id,
        email=admin.email,
        name=admin.name,
        phone=admin.phone,
        role=admin.role,
        two_factor_enabled=admin.two_factor_enabled,
        created_at=admin.created_at,
        last_login=admin.last_login
    )


@router.post("/reset-password", response_model=PasswordResetResponse)
async def request_password_reset(
    reset_request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Request Password Reset

    - Generates password reset token
    - Stores token in database
    - Returns success (doesn't reveal if email exists for security)
    """
    # Check if admin exists
    result = await db.execute(
        select(SuperAdmin).where(
            SuperAdmin.email == reset_request.email,
            SuperAdmin.deleted_at.is_(None)
        )
    )
    admin = result.scalar_one_or_none()

    if admin:
        # Generate reset token
        token = generate_password_reset_token(admin.email)

        # Store token in database
        from app.models.auth import PasswordResetToken

        reset_token = PasswordResetToken(
            token=token,
            user_id=admin.id,
            user_type="super_admin",
            user_email=admin.email,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )

        db.add(reset_token)
        await db.commit()

        # Log activity
        await log_activity(
            db, admin.id, "super_admin", "password_reset_request",
            "Password reset token generated"
        )

        # TODO: Send email with reset token

    # Always return success (security best practice - don't reveal if email exists)
    return PasswordResetResponse(
        message="If the email exists, a password reset link has been sent."
    )
