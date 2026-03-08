from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc
from sqlalchemy.orm import joinedload
from pydantic import BaseModel
from datetime import datetime
import uuid
import os
import aiofiles

from app.database import get_db
from app.models.requirement import Requirement
# from app.models.candidate import Applicant # Will need this later

# CV Parser Service
from app.services.cv_parser import parse_cv_and_save

router = APIRouter(prefix="/api/public", tags=["Candidate Experience"])

# --- Schemas ---

class PublicJobSchema(BaseModel):
    id: int
    job_title: str
    company_name: str
    location: Optional[str]
    remote_type: str
    salary_range: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class PublicJobDetailSchema(PublicJobSchema):
    job_description: str
    required_skills: Optional[str]
    preferred_skills: Optional[str]
    experience_level: Optional[str]
    benefits: Optional[str] = None
    deadline: Optional[datetime] = None

class ApplicationResponse(BaseModel):
    message: str
    application_id: Optional[int] = None

# --- Routes ---

@router.get("/jobs", response_model=List[PublicJobSchema])
async def list_public_jobs(
    search: Optional[str] = None,
    location: Optional[str] = None,
    remote_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List all open job requirements for the public job board.
    """
    query = (
        select(Requirement)
        .options(joinedload(Requirement.client))
        .where(Requirement.status == "open")
        .where(Requirement.deleted_at.is_(None))
    )
    
    if search:
        search_filter = or_(
            Requirement.job_title.ilike(f"%{search}%"),
            Requirement.job_description.ilike(f"%{search}%"),
            Requirement.required_skills.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
        
    if location:
        query = query.where(Requirement.location.ilike(f"%{location}%"))
        
    if remote_type:
        query = query.where(Requirement.remote_type == remote_type)
        
    # Sort by newest first
    query = query.order_by(desc(Requirement.created_at))
    
    result = await db.execute(query)
    jobs = result.scalars().all()
    
    # Map to schema (Pydantic will handle the flattening if config is correct, 
    # but we need to ensure company_name comes from client relation)
    # Pydantic v2 `from_attributes` works well, but a custom validator might be needed for nested access 
    # or we can just return a list of dicts manually constructed to be safe.
    
    output = []
    for job in jobs:
        output.append({
            "id": job.id,
            "job_title": job.job_title,
            "company_name": job.client.company_name if job.client else "Confidential",
            "location": job.location,
            "remote_type": job.remote_type,
            "salary_range": job.salary_range,
            "created_at": job.created_at
        })
        
    return output

@router.get("/jobs/{job_id}", response_model=PublicJobDetailSchema)
async def get_public_job(job_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get detailed information for a specific job.
    """
    query = (
        select(Requirement)
        .options(joinedload(Requirement.client))
        .where(
            Requirement.id == job_id,
            Requirement.status == "open",
            Requirement.deleted_at.is_(None)
        )
    )
    result = await db.execute(query)
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or no longer active")
        
    return {
        "id": job.id,
        "job_title": job.job_title,
        "company_name": job.client.company_name if job.client else "Confidential",
        "location": job.location,
        "remote_type": job.remote_type,
        "salary_range": job.salary_range,
        "created_at": job.created_at,
        "job_description": job.job_description,
        "required_skills": job.required_skills,
        "preferred_skills": job.preferred_skills,
        "experience_level": job.experience_level,
        "deadline": job.deadline
    }

@router.post("/apply", response_model=ApplicationResponse)
async def submit_application(
    background_tasks: BackgroundTasks,
    job_id: int = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    resume: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a job application with resume upload.
    Currently just saves the file. AI processing will be added next.
    """
    # 1. Verify job exists and is open
    job = await get_public_job(job_id, db) # Reuse logic or query directly
    
    # 2. Save file locally for now
    upload_dir = "uploads/resumes"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = os.path.splitext(resume.filename)[1]
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, filename)
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await resume.read()
        await out_file.write(content)
        
    # 3. Trigger background task for parsing and saving
    manual_fields = {
        "name": name,
        "email": email,
        "phone": phone
    }
    
    background_tasks.add_task(
        parse_cv_and_save, 
        file_path=file_path, 
        job_id=job_id, 
        manual_fields=manual_fields
    )
    
    return {
        "message": "Application received successfully. We are processing your resume.",
        "application_id": None # ID will be created in background
    }
