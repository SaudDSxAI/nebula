"""
Client Authentication Routes
Task 4.1: Client signup, login, logout, password reset
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import Dict, Any
import secrets
import re

from app.database import get_db
from app.models.client import Client, ClientUser, ClientSettings
from app.models.activity import ActivityLog
from app.models.auth import PasswordResetToken
from app.schemas.client_portal import (
    ClientSignupRequest,
    ClientLoginRequest,
    ClientAuthResponse,
)
from app.schemas.auth import (
    LoginResponse,
    LogoutResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    PasswordResetRequest,
    PasswordResetResponse,
)
from app.utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    generate_password_reset_token,
)
from app.utils.session import create_session
from app.middleware.auth import require_client
from app.config import settings

router = APIRouter(prefix="/api/client/auth", tags=["Client Auth"])


def generate_subdomain(company_name: str) -> str:
    """Generate a URL-safe subdomain from company name"""
    slug = re.sub(r'[^a-z0-9]+', '-', company_name.lower()).strip('-')
    return slug[:50]


def generate_api_key() -> str:
    """Generate a secure API key"""
    return f"trm_{secrets.token_urlsafe(32)}"


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
        entity_type="client",
        entity_id=user_id,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(activity)
    await db.commit()


@router.post("/signup", response_model=ClientAuthResponse, status_code=status.HTTP_201_CREATED)
async def client_signup(
    signup_data: ClientSignupRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Client Signup

    - Creates new client account with company info
    - Generates API key and subdomain
    - Creates default settings
    - Returns JWT tokens for immediate login
    """
    # Check if email already exists
    result = await db.execute(
        select(Client).where(Client.email == signup_data.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )

    # Check if company name already exists
    result = await db.execute(
        select(Client).where(Client.company_name == signup_data.company_name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A company with this name already exists"
        )

    # Generate subdomain
    subdomain = generate_subdomain(signup_data.company_name)

    # Check if subdomain is unique, append random chars if not
    result = await db.execute(
        select(Client).where(Client.unique_subdomain == subdomain)
    )
    if result.scalar_one_or_none():
        subdomain = f"{subdomain}-{secrets.token_hex(3)}"

    # Create client
    client = Client(
        email=signup_data.email,
        password_hash=hash_password(signup_data.password),
        company_name=signup_data.company_name,
        unique_subdomain=subdomain,
        website=signup_data.website,
        phone=signup_data.phone,
        plan=signup_data.plan,
        status="active",
        api_key=generate_api_key(),
        api_key_created_at=datetime.utcnow(),
    )

    db.add(client)
    await db.flush()  # Get client.id

    # Create default settings
    client_settings = ClientSettings(
        client_id=client.id,
        ai_assistant_enabled=True,
        cv_parsing_enabled=True,
        email_notifications=True,
        weekly_digest=True,
    )
    db.add(client_settings)
    await db.commit()
    await db.refresh(client)

    # Create tokens
    token_data = {
        "user_id": client.id,
        "user_type": "client",
        "email": client.email
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Create session
    await create_session(
        db=db,
        user_id=client.id,
        user_type="client",
        user_email=client.email,
        access_token=access_token,
        refresh_token=refresh_token,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )

    # Log activity
    await log_activity(
        db, client.id, "client", "signup",
        f"Client '{client.company_name}' registered ({client.plan} plan)",
        request.client.host if request.client else None,
        request.headers.get("user-agent")
    )

    return ClientAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        client={
            "id": client.id,
            "email": client.email,
            "company_name": client.company_name,
            "plan": client.plan,
            "status": client.status,
            "unique_subdomain": client.unique_subdomain,
            "user_type": "client",
        }
    )


@router.post("/login", response_model=ClientAuthResponse)
async def client_login(
    credentials: ClientLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Client Login — supports both Client (owner) and ClientUser (team member) login.
    First checks Client table, then falls back to ClientUser.
    """
    # 1. Try Client (owner) login
    result = await db.execute(
        select(Client).where(
            Client.email == credentials.email,
            Client.deleted_at.is_(None)
        )
    )
    client = result.scalar_one_or_none()

    if client:
        # Check locked
        if client.locked_until and client.locked_until > datetime.utcnow():
            minutes_left = int((client.locked_until - datetime.utcnow()).total_seconds() / 60)
            raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=f"Account locked. Try again in {minutes_left} minutes.")

        if client.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Account is {client.status}. Contact support.")

        if not verify_password(credentials.password, client.password_hash):
            client.failed_login_attempts += 1
            if client.failed_login_attempts >= 5:
                client.locked_until = datetime.utcnow() + timedelta(hours=1)
                await db.commit()
                raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="Too many failed attempts. Account locked for 1 hour.")
            await db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        client.failed_login_attempts = 0
        client.locked_until = None
        client.last_login = datetime.utcnow()
        await db.commit()

        token_data = {"user_id": client.id, "user_type": "client", "email": client.email}
        access_token = create_access_token(token_data)
        refresh_tok = create_refresh_token(token_data)

        await create_session(db=db, user_id=client.id, user_type="client", user_email=client.email,
                             access_token=access_token, refresh_token=refresh_tok,
                             ip_address=request.client.host if request.client else None,
                             user_agent=request.headers.get("user-agent"))

        await log_activity(db, client.id, "client", "login", f"Client '{client.company_name}' logged in",
                           request.client.host if request.client else None, request.headers.get("user-agent"))

        return ClientAuthResponse(
            access_token=access_token, refresh_token=refresh_tok, token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS * 3600,
            client={"id": client.id, "email": client.email, "company_name": client.company_name,
                    "plan": client.plan, "status": client.status, "unique_subdomain": client.unique_subdomain,
                    "user_type": "client", "role": "admin"}
        )

    # 2. Try ClientUser (team member) login
    result = await db.execute(
        select(ClientUser).where(
            ClientUser.email == credentials.email,
            ClientUser.deleted_at.is_(None)
        )
    )
    team_user = result.scalar_one_or_none()

    if not team_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not team_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account has been deactivated.")

    # Check locked
    if team_user.locked_until and team_user.locked_until > datetime.utcnow():
        minutes_left = int((team_user.locked_until - datetime.utcnow()).total_seconds() / 60)
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=f"Account locked. Try again in {minutes_left} minutes.")

    if not verify_password(credentials.password, team_user.password_hash):
        team_user.failed_login_attempts += 1
        if team_user.failed_login_attempts >= 5:
            team_user.locked_until = datetime.utcnow() + timedelta(hours=1)
            await db.commit()
            raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="Too many failed attempts. Account locked for 1 hour.")
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # Get parent client for company info
    parent_result = await db.execute(select(Client).where(Client.id == team_user.client_id))
    parent_client = parent_result.scalar_one_or_none()

    if not parent_client or parent_client.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization account is inactive.")

    team_user.failed_login_attempts = 0
    team_user.locked_until = None
    team_user.last_login = datetime.utcnow()
    await db.commit()

    token_data = {"user_id": team_user.id, "user_type": "client_user", "email": team_user.email}
    access_token = create_access_token(token_data)
    refresh_tok = create_refresh_token(token_data)

    await create_session(db=db, user_id=team_user.id, user_type="client_user", user_email=team_user.email,
                         access_token=access_token, refresh_token=refresh_tok,
                         ip_address=request.client.host if request.client else None,
                         user_agent=request.headers.get("user-agent"))

    await log_activity(db, team_user.id, "client_user", "login", f"Team member '{team_user.name}' logged in",
                       request.client.host if request.client else None, request.headers.get("user-agent"))

    return ClientAuthResponse(
        access_token=access_token, refresh_token=refresh_tok, token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        client={"id": parent_client.id, "email": team_user.email, "company_name": parent_client.company_name,
                "plan": parent_client.plan, "status": parent_client.status,
                "unique_subdomain": parent_client.unique_subdomain,
                "user_type": "client_user", "role": team_user.role, "name": team_user.name,
                "user_id": team_user.id}
    )


@router.post("/logout", response_model=LogoutResponse)
async def client_logout(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db)
):
    """
    Client Logout - Revokes the current session
    """
    await log_activity(
        db,
        current_user["user_id"],
        "client",
        "logout",
        "Client logged out"
    )

    return LogoutResponse(message="Logged out successfully")


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    refresh_request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh Access Token for client
    """
    payload = verify_token(refresh_request.refresh_token, token_type="refresh")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user_id = payload.get("user_id")
    user_type = payload.get("user_type")

    if user_type != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user type"
        )

    result = await db.execute(
        select(Client).where(
            Client.id == user_id,
            Client.deleted_at.is_(None),
            Client.status == "active"
        )
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Client not found or inactive"
        )

    token_data = {
        "user_id": client.id,
        "user_type": "client",
        "email": client.email
    }

    new_access_token = create_access_token(token_data)

    return RefreshTokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS * 3600
    )


@router.get("/me")
async def get_current_client(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current client info — works for both owner and team member.
    """
    user_obj = current_user["user_object"]
    user_type = current_user["user_type"]

    if user_type == "client":
        return {
            "id": user_obj.id,
            "email": user_obj.email,
            "company_name": user_obj.company_name,
            "unique_subdomain": user_obj.unique_subdomain,
            "logo_url": user_obj.logo_url,
            "website": user_obj.website,
            "phone": user_obj.phone,
            "plan": user_obj.plan,
            "status": user_obj.status,
            "api_key": user_obj.api_key,
            "created_at": user_obj.created_at.isoformat() if user_obj.created_at else None,
            "last_login": user_obj.last_login.isoformat() if user_obj.last_login else None,
            "user_type": "client",
            "role": "admin",
            # Portal customisation
            "portal_headline": user_obj.portal_headline,
            "portal_tagline": user_obj.portal_tagline,
            "portal_contact_email": user_obj.portal_contact_email,
            # Portal stats
            "portal_stat1_num": user_obj.portal_stat1_num or '500+',
            "portal_stat1_label": user_obj.portal_stat1_label or 'PLACEMENTS',
            "portal_stat2_num": user_obj.portal_stat2_num or 'AI',
            "portal_stat2_label": user_obj.portal_stat2_label or 'POWERED',
            "portal_stat3_num": user_obj.portal_stat3_num or '24/7',
            "portal_stat3_label": user_obj.portal_stat3_label or 'ACCESS',
            # Logo adjustments
            "logo_scale": user_obj.logo_scale or '1',
            "logo_offset_x": user_obj.logo_offset_x or 0,
            "logo_offset_y": user_obj.logo_offset_y or 0,
        }
    else:
        # ClientUser — get parent client info
        parent_result = await db.execute(select(Client).where(Client.id == user_obj.client_id))
        parent_client = parent_result.scalar_one_or_none()

        return {
            "id": parent_client.id if parent_client else None,
            "user_id": user_obj.id,
            "email": user_obj.email,
            "name": user_obj.name,
            "company_name": parent_client.company_name if parent_client else None,
            "unique_subdomain": parent_client.unique_subdomain if parent_client else None,
            "logo_url": parent_client.logo_url if parent_client else None,
            "plan": parent_client.plan if parent_client else None,
            "status": parent_client.status if parent_client else None,
            "created_at": user_obj.created_at.isoformat() if user_obj.created_at else None,
            "last_login": user_obj.last_login.isoformat() if user_obj.last_login else None,
            "user_type": "client_user",
            "role": user_obj.role,
        }


@router.post("/reset-password", response_model=PasswordResetResponse)
async def request_password_reset(
    reset_request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Request Password Reset for client
    """
    result = await db.execute(
        select(Client).where(
            Client.email == reset_request.email,
            Client.deleted_at.is_(None)
        )
    )
    client = result.scalar_one_or_none()

    if client:
        token = generate_password_reset_token(client.email)

        reset_token = PasswordResetToken(
            token=token,
            user_id=client.id,
            user_type="client",
            user_email=client.email,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )

        db.add(reset_token)
        await db.commit()

        await log_activity(
            db, client.id, "client", "password_reset_request",
            "Password reset token generated"
        )

        # TODO: Send email with reset link

    return PasswordResetResponse(
        message="If the email exists, a password reset link has been sent."
    )


# ========================
# SETTINGS ENDPOINTS
# ========================

from pydantic import BaseModel as _BaseModel

class ProfileUpdateRequest(_BaseModel):
    company_name: str | None = None
    website: str | None = None
    phone: str | None = None
    industry: str | None = None
    headquarters: str | None = None
    team_size: str | None = None
    # Portal customisation
    portal_headline: str | None = None
    portal_tagline: str | None = None
    portal_contact_email: str | None = None
    # Portal stats
    portal_stat1_num: str | None = None
    portal_stat1_label: str | None = None
    portal_stat2_num: str | None = None
    portal_stat2_label: str | None = None
    portal_stat3_num: str | None = None
    portal_stat3_label: str | None = None
    # Logo adjustments
    logo_scale: str | None = None
    logo_offset_x: int | None = None
    logo_offset_y: int | None = None



class ChangePasswordRequest(_BaseModel):
    current_password: str
    new_password: str


class NotificationSettingsRequest(_BaseModel):
    email_notifications: bool | None = None
    weekly_digest: bool | None = None
    notification_email: str | None = None


@router.put("/me/profile")
async def update_profile(
    data: ProfileUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Update company profile fields."""
    client_id = current_user["client_id"]
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    update = data.model_dump(exclude_unset=True)
    for k, v in update.items():
        if v is not None:
            setattr(client, k, v)

    from datetime import datetime as _dt
    client.updated_at = _dt.utcnow()
    await db.commit()
    await db.refresh(client)

    return {
        "company_name": client.company_name, "website": client.website,
        "phone": client.phone, "industry": client.industry,
        "headquarters": client.headquarters, "team_size": client.team_size,
    }


@router.post("/me/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Change own password (client owner only)."""
    from app.utils.auth import hash_password as _hash, verify_password as _verify

    user_type = current_user["user_type"]
    user_obj = current_user["user_object"]

    if not _verify(data.current_password, user_obj.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    user_obj.password_hash = _hash(data.new_password)
    from datetime import datetime as _dt
    user_obj.updated_at = _dt.utcnow()
    await db.commit()

    return {"message": "Password changed successfully."}


@router.post("/me/regenerate-api-key")
async def regenerate_api_key(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate the API key for the client account."""
    if current_user["user_type"] != "client":
        raise HTTPException(status_code=403, detail="Only the account owner can regenerate the API key.")

    client_id = current_user["client_id"]
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    client.api_key = generate_api_key()
    from datetime import datetime as _dt
    client.api_key_created_at = _dt.utcnow()
    await db.commit()
    await db.refresh(client)

    return {"api_key": client.api_key, "api_key_created_at": client.api_key_created_at.isoformat()}


@router.get("/me/notifications")
async def get_notification_settings(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Get notification settings."""
    client_id = current_user["client_id"]
    result = await db.execute(
        select(ClientSettings).where(ClientSettings.client_id == client_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        return {"email_notifications": True, "weekly_digest": True, "notification_email": None}
    return {
        "email_notifications": s.email_notifications,
        "weekly_digest": s.weekly_digest,
        "notification_email": s.notification_email,
    }


@router.put("/me/notifications")
async def update_notification_settings(
    data: NotificationSettingsRequest,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Update notification settings."""
    client_id = current_user["client_id"]
    result = await db.execute(
        select(ClientSettings).where(ClientSettings.client_id == client_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        s = ClientSettings(client_id=client_id)
        db.add(s)

    if data.email_notifications is not None:
        s.email_notifications = data.email_notifications
    if data.weekly_digest is not None:
        s.weekly_digest = data.weekly_digest
    if data.notification_email is not None:
        s.notification_email = data.notification_email

    await db.commit()
    await db.refresh(s)
    return {
        "email_notifications": s.email_notifications,
        "weekly_digest": s.weekly_digest,
        "notification_email": s.notification_email,
    }

