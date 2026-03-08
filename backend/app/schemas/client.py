"""
Client Schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# Base Client Schema
class ClientBase(BaseModel):
    email: EmailStr
    company_name: str = Field(..., min_length=2, max_length=255)
    website: Optional[str] = None
    phone: Optional[str] = None
    plan: str = Field(default="free", pattern="^(free|professional|enterprise)$")
    company_description: Optional[str] = None
    industry: Optional[str] = None
    team_size: Optional[str] = None
    headquarters: Optional[str] = None
    benefits: Optional[str] = None


# Client Create
class ClientCreate(ClientBase):
    password: str = Field(..., min_length=8)


# Client Update
class ClientUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=2, max_length=255)
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    plan: Optional[str] = Field(None, pattern="^(free|professional|enterprise)$")
    logo_url: Optional[str] = None
    company_description: Optional[str] = None
    company_data: Optional[str] = None
    industry: Optional[str] = None
    team_size: Optional[str] = None
    headquarters: Optional[str] = None
    benefits: Optional[str] = None


# Client Response
class ClientResponse(BaseModel):
    id: int
    email: str
    company_name: str
    unique_subdomain: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    company_description: Optional[str] = None
    industry: Optional[str] = None
    team_size: Optional[str] = None
    headquarters: Optional[str] = None
    benefits: Optional[str] = None
    plan: str
    status: str
    api_key: Optional[str] = None
    email_verified: bool
    two_factor_enabled: bool
    gdpr_consent: bool
    gdpr_consent_date: Optional[datetime] = None
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


# Client List Item (lighter version for list view)
class ClientListItem(BaseModel):
    id: int
    email: str
    company_name: str
    plan: str
    status: str
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


# Client Status Update
class ClientStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|inactive|suspended)$")


# Pagination Response
class ClientListResponse(BaseModel):
    clients: List[ClientListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# Password Reset
class ClientPasswordReset(BaseModel):
    new_password: str = Field(..., min_length=8)
