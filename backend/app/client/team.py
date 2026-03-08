"""
Team Management Routes
CRUD for client team members (admin, member, viewer)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, EmailStr, Field

from app.database import get_db
from app.models.client import ClientUser
from app.models.activity import ActivityLog
from app.utils.auth import hash_password
from app.middleware.auth import require_client, require_client_admin

router = APIRouter(prefix="/api/client/team", tags=["Client Team"])


# ── Schemas ──

class CreateTeamMemberRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(default="member", pattern="^(admin|member|viewer)$")


class UpdateTeamMemberRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    role: Optional[str] = Field(None, pattern="^(admin|member|viewer)$")
    is_active: Optional[bool] = None


# ── Helpers ──

async def log_activity(db: AsyncSession, user_id: int, action: str, description: str):
    activity = ActivityLog(
        user_id=user_id, user_type="client", action=action,
        entity_type="team", description=description,
    )
    db.add(activity)
    await db.commit()


# ── Endpoints ──

@router.get("")
async def list_team_members(
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """List all team members for the client organization, including the account owner."""
    from app.models.client import Client
    client_id = current_user["client_id"]

    # Fetch the account owner (Client row)
    owner_result = await db.execute(
        select(Client).where(Client.id == client_id, Client.deleted_at.is_(None))
    )
    owner = owner_result.scalar_one_or_none()

    # Fetch all ClientUser team members
    result = await db.execute(
        select(ClientUser).where(
            ClientUser.client_id == client_id,
            ClientUser.deleted_at.is_(None)
        ).order_by(ClientUser.created_at.desc())
    )
    users = result.scalars().all()

    members = []

    # Always prepend the owner as an admin
    if owner:
        members.append({
            "id": owner.id,
            "name": owner.company_name,  # owner name is the company; show email prefix as name
            "email": owner.email,
            "role": "admin",
            "is_active": True,
            "is_owner": True,
            "created_at": owner.created_at.isoformat() if owner.created_at else None,
            "last_login": owner.last_login.isoformat() if owner.last_login else None,
        })

    # Append team members
    for u in users:
        members.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "is_owner": False,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login.isoformat() if u.last_login else None,
        })

    return {
        "team_members": members,
        "total": len(members),
    }



@router.post("", status_code=status.HTTP_201_CREATED)
async def create_team_member(
    data: CreateTeamMemberRequest,
    current_user: Dict[str, Any] = Depends(require_client_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new team member (admin only)."""
    client_id = current_user["client_id"]

    # Check email uniqueness across both clients and client_users
    from app.models.client import Client
    existing_client = await db.execute(
        select(Client).where(Client.email == data.email)
    )
    if existing_client.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This email is already registered as a client account.")

    existing_user = await db.execute(
        select(ClientUser).where(ClientUser.email == data.email, ClientUser.deleted_at.is_(None))
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A team member with this email already exists.")

    user = ClientUser(
        client_id=client_id,
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await log_activity(db, current_user["user_id"], "team_create",
                       f"Created team member '{user.name}' ({user.role})")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.put("/{user_id}")
async def update_team_member(
    user_id: int,
    data: UpdateTeamMemberRequest,
    current_user: Dict[str, Any] = Depends(require_client_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a team member's role or active status (admin only)."""
    client_id = current_user["client_id"]

    result = await db.execute(
        select(ClientUser).where(
            ClientUser.id == user_id,
            ClientUser.client_id == client_id,
            ClientUser.deleted_at.is_(None)
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Team member not found.")

    changes = []
    if data.name is not None:
        user.name = data.name
        changes.append(f"name→{data.name}")
    if data.role is not None:
        user.role = data.role
        changes.append(f"role→{data.role}")
    if data.is_active is not None:
        user.is_active = data.is_active
        changes.append(f"active→{data.is_active}")

    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    if changes:
        await log_activity(db, current_user["user_id"], "team_update",
                           f"Updated '{user.name}': {', '.join(changes)}")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }


@router.delete("/{user_id}")
async def delete_team_member(
    user_id: int,
    current_user: Dict[str, Any] = Depends(require_client_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a team member (admin only)."""
    client_id = current_user["client_id"]

    result = await db.execute(
        select(ClientUser).where(
            ClientUser.id == user_id,
            ClientUser.client_id == client_id,
            ClientUser.deleted_at.is_(None)
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Team member not found.")

    user.deleted_at = datetime.utcnow()
    user.is_active = False
    await db.commit()

    await log_activity(db, current_user["user_id"], "team_delete",
                       f"Removed team member '{user.name}'")

    return {"message": f"Team member '{user.name}' has been removed."}


class ResetPasswordRequest(BaseModel):
    password: str = Field(..., min_length=6)


@router.post("/{user_id}/reset-password")
async def reset_team_member_password(
    user_id: int,
    data: ResetPasswordRequest,
    current_user: Dict[str, Any] = Depends(require_client_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reset a team member's password (admin only)."""
    client_id = current_user["client_id"]

    result = await db.execute(
        select(ClientUser).where(
            ClientUser.id == user_id,
            ClientUser.client_id == client_id,
            ClientUser.deleted_at.is_(None)
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Team member not found.")

    user.password_hash = hash_password(data.password)
    user.updated_at = datetime.utcnow()
    await db.commit()

    await log_activity(db, current_user["user_id"], "team_password_reset",
                       f"Reset password for '{user.name}'")

    return {"message": f"Password reset successfully for '{user.name}'."}


@router.get("/{user_id}/workload")
async def get_member_workload(
    user_id: int,
    current_user: Dict[str, Any] = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Get assigned requirements for a team member."""
    from app.models.requirement import Requirement
    client_id = current_user["client_id"]

    result = await db.execute(
        select(Requirement).where(
            Requirement.assigned_to_user_id == user_id,
            Requirement.client_id == client_id,
            Requirement.deleted_at.is_(None),
        ).order_by(Requirement.created_at.desc())
    )
    reqs = result.scalars().all()

    return {
        "requirements": [
            {
                "id": r.id,
                "job_title": r.job_title,
                "company_name": r.company_name,
                "status": r.status,
                "priority": r.priority,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reqs
        ],
        "count": len(reqs),
    }

