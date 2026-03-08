"""
Super Admin - Client Management Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update, delete
from sqlalchemy.orm import selectinload
from datetime import datetime
from typing import Dict, Any, Optional
import secrets

from app.database import get_db
from app.models.client import Client, ClientSettings
from app.models.activity import ActivityLog
from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientListItem,
    ClientListResponse,
    ClientStatusUpdate,
    ClientPasswordReset,
)
from app.utils.auth import hash_password
from app.middleware.auth import require_super_admin

router = APIRouter(prefix="/api/admin/clients", tags=["Super Admin - Clients"])


async def log_activity(
    db: AsyncSession,
    admin_id: int,
    action: str,
    entity_id: int,
    description: str
):
    """Helper function to log activity"""
    activity = ActivityLog(
        user_id=admin_id,
        user_type="super_admin",
        action=action,
        entity_type="client",
        entity_id=entity_id,
        description=description
    )
    db.add(activity)


@router.get("", response_model=ClientListResponse)
async def list_clients(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by company name or email"),
    plan: Optional[str] = Query(None, description="Filter by plan"),
    status: Optional[str] = Query(None, description="Filter by status"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    current_user: Dict[str, Any] = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all clients with pagination, search, and filters

    - Supports search by company name and email
    - Filter by plan (free, professional, enterprise)
    - Filter by status (active, inactive, suspended)
    - Sorting by various fields
    """
    # Base query
    query = select(Client).where(Client.deleted_at.is_(None))

    # Apply search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Client.company_name.ilike(search_pattern),
                Client.email.ilike(search_pattern)
            )
        )

    # Apply plan filter
    if plan:
        query = query.where(Client.plan == plan)

    # Apply status filter
    if status:
        query = query.where(Client.status == status)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply sorting
    sort_field = getattr(Client, sort_by, Client.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_field.desc())
    else:
        query = query.order_by(sort_field.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    # Execute query
    result = await db.execute(query)
    clients = result.scalars().all()

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size

    return ClientListResponse(
        clients=[ClientListItem.model_validate(client) for client in clients],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    current_user: Dict[str, Any] = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new client

    - Validates unique email and company name
    - Generates API key
    - Creates default settings
    - Hashes password
    """
    # Check if email already exists
    result = await db.execute(
        select(Client).where(Client.email == client_data.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if company name already exists
    result = await db.execute(
        select(Client).where(Client.company_name == client_data.company_name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company name already taken"
        )

    # Generate unique subdomain from company name
    subdomain = client_data.company_name.lower().replace(" ", "-").replace("_", "-")
    subdomain = "".join(c for c in subdomain if c.isalnum() or c == "-")

    # Generate API key
    api_key = f"trm_{secrets.token_urlsafe(32)}"

    # Create client
    new_client = Client(
        email=client_data.email,
        password_hash=hash_password(client_data.password),
        company_name=client_data.company_name,
        unique_subdomain=subdomain,
        website=client_data.website,
        phone=client_data.phone,
        plan=client_data.plan,
        status="active",
        api_key=api_key,
        api_key_created_at=datetime.utcnow(),
        email_verified=False,
        created_at=datetime.utcnow()
    )

    db.add(new_client)
    await db.flush()  # Flush to get the ID

    # Create default settings
    settings = ClientSettings(
        client_id=new_client.id,
        ai_assistant_enabled=True,
        cv_parsing_enabled=True,
        email_notifications=True
    )
    db.add(settings)

    await db.commit()
    await db.refresh(new_client)

    # Log activity
    await log_activity(
        db,
        current_user["user_id"],
        "create",
        new_client.id,
        f"Created new client: {new_client.company_name}"
    )
    await db.commit()

    return ClientResponse.model_validate(new_client)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    current_user: Dict[str, Any] = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get client details by ID

    - Returns full client information
    - Includes settings
    """
    result = await db.execute(
        select(Client)
        .options(selectinload(Client.settings))
        .where(Client.id == client_id, Client.deleted_at.is_(None))
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    return ClientResponse.model_validate(client)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    current_user: Dict[str, Any] = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update client information

    - Can update company details
    - Can change plan
    - Can update contact information
    """
    # Get client
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.deleted_at.is_(None))
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # Check email uniqueness if being changed
    if client_data.email and client_data.email != client.email:
        result = await db.execute(
            select(Client).where(Client.email == client_data.email)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )

    # Check company name uniqueness if being changed
    if client_data.company_name and client_data.company_name != client.company_name:
        result = await db.execute(
            select(Client).where(Client.company_name == client_data.company_name)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company name already taken"
            )

    # Update fields
    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    client.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(client)

    # Log activity
    await log_activity(
        db,
        current_user["user_id"],
        "update",
        client.id,
        f"Updated client: {client.company_name}"
    )
    await db.commit()

    return ClientResponse.model_validate(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    current_user: Dict[str, Any] = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Soft delete a client

    - Sets deleted_at timestamp
    - Client data is retained for audit purposes
    """
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.deleted_at.is_(None))
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # Soft delete
    client.deleted_at = datetime.utcnow()
    client.status = "inactive"
    await db.commit()

    # Log activity
    await log_activity(
        db,
        current_user["user_id"],
        "delete",
        client.id,
        f"Deleted client: {client.company_name}"
    )
    await db.commit()


@router.put("/{client_id}/status", response_model=ClientResponse)
async def update_client_status(
    client_id: int,
    status_update: ClientStatusUpdate,
    current_user: Dict[str, Any] = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update client status

    - Can activate, deactivate, or suspend a client
    - Logs all status changes
    """
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.deleted_at.is_(None))
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    old_status = client.status
    client.status = status_update.status
    client.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(client)

    # Log activity
    await log_activity(
        db,
        current_user["user_id"],
        "status_change",
        client.id,
        f"Changed client status from {old_status} to {status_update.status}: {client.company_name}"
    )
    await db.commit()

    return ClientResponse.model_validate(client)


@router.post("/{client_id}/reset-password")
async def reset_client_password(
    client_id: int,
    password_data: ClientPasswordReset,
    current_user: Dict[str, Any] = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Reset client password (admin action)

    - Hashes and sets new password
    - Logs the action
    """
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.deleted_at.is_(None))
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # Update password
    client.password_hash = hash_password(password_data.new_password)
    client.updated_at = datetime.utcnow()
    await db.commit()

    # Log activity
    await log_activity(
        db,
        current_user["user_id"],
        "password_reset",
        client.id,
        f"Reset password for client: {client.company_name}"
    )
    await db.commit()

    return {"message": "Password reset successfully"}
