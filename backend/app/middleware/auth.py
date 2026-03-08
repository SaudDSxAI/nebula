"""
Authentication Middleware
Dependency injection functions for FastAPI route protection
"""
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.utils.auth import verify_token
from app.models.super_admin import SuperAdmin
from app.models.client import Client, ClientUser
from app.models.candidate import Candidate
from app.models.auth import Session

# Security scheme for Swagger UI
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Dependency to get current authenticated user from JWT token

    Args:
        credentials: Bearer token from Authorization header
        db: Database session

    Returns:
        Dictionary with user information

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials

    # Verify token
    payload = verify_token(token, token_type="access")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user info from payload
    user_id = payload.get("user_id")
    user_type = payload.get("user_type")
    email = payload.get("email")

    if not user_id or not user_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify user exists in database
    user = None
    if user_type == "super_admin":
        result = await db.execute(
            select(SuperAdmin).where(SuperAdmin.id == user_id, SuperAdmin.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
    elif user_type == "client":
        result = await db.execute(
            select(Client).where(Client.id == user_id, Client.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
    elif user_type == "client_user":
        result = await db.execute(
            select(ClientUser).where(ClientUser.id == user_id, ClientUser.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
    elif user_type == "candidate":
        result = await db.execute(
            select(Candidate).where(Candidate.id == user_id, Candidate.is_active == True)
        )
        user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deleted",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Return user info
    return {
        "user_id": user_id,
        "user_type": user_type,
        "email": email,
        "user_object": user
    }


async def require_auth(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Dependency to require any authenticated user

    Args:
        current_user: Current user from get_current_user

    Returns:
        User information dictionary
    """
    return current_user


async def require_super_admin(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Dependency to require super admin authentication

    Args:
        current_user: Current user from get_current_user

    Returns:
        User information dictionary

    Raises:
        HTTPException: If user is not a super admin
    """
    if current_user.get("user_type") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )

    return current_user


async def require_client(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Dependency to require client or client_user authentication.
    Enriches the user dict with role and client_id.
    - Client owner (user_type=client): role='admin', client_id=user_id
    - ClientUser (user_type=client_user): role from DB, client_id from DB
    """
    user_type = current_user.get("user_type")

    if user_type not in ["client", "client_user"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Client access required"
        )

    user_obj = current_user.get("user_object")

    if user_type == "client":
        current_user["role"] = "admin"
        current_user["client_id"] = user_obj.id
    elif user_type == "client_user":
        current_user["role"] = getattr(user_obj, "role", "member")
        current_user["client_id"] = user_obj.client_id
        if not user_obj.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated"
            )

    return current_user


async def require_client_admin(
    current_user: Dict[str, Any] = Depends(require_client)
) -> Dict[str, Any]:
    """
    Dependency to require admin role (client owner or admin client_user).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def require_client_write(
    current_user: Dict[str, Any] = Depends(require_client)
) -> Dict[str, Any]:
    """
    Dependency to require write access (admin or member, not viewer).
    """
    if current_user.get("role") == "viewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewer accounts cannot modify data"
        )
    return current_user


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """
    Dependency to get current user if token is provided, but don't require it

    Args:
        authorization: Optional Authorization header
        db: Database session

    Returns:
        User information dictionary if authenticated, None otherwise
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "")

    # Verify token
    payload = verify_token(token, token_type="access")
    if payload is None:
        return None

    user_id = payload.get("user_id")
    user_type = payload.get("user_type")
    email = payload.get("email")

    if not user_id or not user_type:
        return None

    return {
        "user_id": user_id,
        "user_type": user_type,
        "email": email
    }
