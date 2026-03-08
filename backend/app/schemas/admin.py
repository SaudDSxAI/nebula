"""
Super Admin Schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class SuperAdminBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None


class SuperAdminCreate(SuperAdminBase):
    password: str


class SuperAdminUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None


class SuperAdminResponse(BaseModel):
    id: int
    email: str
    name: str
    phone: Optional[str] = None
    role: str
    two_factor_enabled: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True
