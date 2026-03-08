"""
Audit Log Routes
Scoped to the authenticated client — returns activity logs for their organization.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Dict, Any, Optional

from app.database import get_db
from app.models.activity import ActivityLog
from app.models.client import Client, ClientUser
from app.middleware.auth import require_client, require_client_admin

router = APIRouter(prefix="/api/client/audit", tags=["Client Audit"])


@router.get("/logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_email: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_client_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Return paginated audit logs scoped to this client's organization.
    Includes actions by the account owner and all team members.
    Admin only.
    """
    client_id = current_user["client_id"]

    # Get all team member IDs for this client
    team_result = await db.execute(
        select(ClientUser.id, ClientUser.email).where(
            ClientUser.client_id == client_id,
            ClientUser.deleted_at.is_(None),
        )
    )
    team_rows = team_result.all()
    team_ids = [r[0] for r in team_rows]
    team_emails = {r[0]: r[1] for r in team_rows}

    # Get owner email
    owner_result = await db.execute(
        select(Client.id, Client.email).where(Client.id == client_id, Client.deleted_at.is_(None))
    )
    owner_row = owner_result.one_or_none()
    owner_id = owner_row[0] if owner_row else None
    owner_email = owner_row[1] if owner_row else None

    # Base query: logs by the owner OR any team member of this client
    # Match on (user_id=owner_id AND user_type='client')
    # OR (user_id IN team_ids AND user_type='client_user')
    conditions = []
    if owner_id:
        conditions.append(
            (ActivityLog.user_id == owner_id) & (ActivityLog.user_type == "client")
        )
    if team_ids:
        conditions.append(
            (ActivityLog.user_id.in_(team_ids)) & (ActivityLog.user_type == "client_user")
        )

    if not conditions:
        return {"logs": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 1}

    base_query = select(ActivityLog).where(or_(*conditions))

    # Optional filters
    if action:
        base_query = base_query.where(ActivityLog.action.ilike(f"%{action}%"))
    if entity_type:
        base_query = base_query.where(ActivityLog.entity_type == entity_type)
    if user_email:
        base_query = base_query.where(ActivityLog.user_email.ilike(f"%{user_email}%"))

    # Count
    count_q = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Sort + paginate
    base_query = base_query.order_by(ActivityLog.created_at.desc())
    offset = (page - 1) * page_size
    base_query = base_query.offset(offset).limit(page_size)

    result = await db.execute(base_query)
    logs = result.scalars().all()

    import math

    return {
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "user_type": log.user_type,
                "user_email": log.user_email or (
                    owner_email if (log.user_id == owner_id and log.user_type == "client")
                    else team_emails.get(log.user_id, "—")
                ),
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "description": log.description,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total > 0 else 1,
    }


@router.get("/summary")
async def get_audit_summary(
    current_user: Dict[str, Any] = Depends(require_client_admin),
    db: AsyncSession = Depends(get_db),
):
    """Quick summary: counts per action type for badge display."""
    client_id = current_user["client_id"]

    team_result = await db.execute(
        select(ClientUser.id).where(
            ClientUser.client_id == client_id, ClientUser.deleted_at.is_(None)
        )
    )
    team_ids = [r[0] for r in team_result.all()]

    owner_result = await db.execute(
        select(Client.id).where(Client.id == client_id, Client.deleted_at.is_(None))
    )
    owner_row = owner_result.scalar_one_or_none()

    conditions = []
    if owner_row:
        conditions.append(
            (ActivityLog.user_id == owner_row) & (ActivityLog.user_type == "client")
        )
    if team_ids:
        conditions.append(
            (ActivityLog.user_id.in_(team_ids)) & (ActivityLog.user_type == "client_user")
        )

    if not conditions:
        return {"total": 0, "by_action": {}}

    base = select(ActivityLog.action, func.count(ActivityLog.id).label("cnt")).where(
        or_(*conditions)
    ).group_by(ActivityLog.action)

    result = await db.execute(base)
    rows = result.all()
    by_action = {r[0]: r[1] for r in rows}
    total = sum(by_action.values())

    return {"total": total, "by_action": by_action}
