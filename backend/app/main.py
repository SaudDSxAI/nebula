"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, Any
import logging
import os

from app.middleware.auth import require_auth, get_current_user
from app.utils.auth import create_access_token, hash_password
from app.admin.auth import router as admin_auth_router
from app.admin.clients import router as admin_clients_router
from app.admin.dashboard import router as admin_dashboard_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="TRM Platform API",
    description="AI-Powered Talent Relationship Management Platform",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Run database initialization on startup
from app.database import init_db

@app.on_event("startup")
async def startup_event():
    await init_db()

# Configure CORS
_default_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]
_extra = os.environ.get("ALLOWED_ORIGINS", "")
_origins = _default_origins + [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://.*\.up\.railway\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Register routers
app.include_router(admin_auth_router)
app.include_router(admin_clients_router)
app.include_router(admin_dashboard_router)

# Client Portal Routers
from app.client.auth import router as client_auth_router
from app.client.requirements import router as client_requirements_router
from app.client.candidates import router as client_candidates_router
from app.client.dashboard import router as client_dashboard_router
from app.client.ai import router as client_ai_router
from app.client.company import router as client_company_router
from app.client.team import router as client_team_router
from app.client.audit import router as client_audit_router

app.include_router(client_auth_router)
app.include_router(client_requirements_router)
app.include_router(client_candidates_router)
app.include_router(client_dashboard_router)
app.include_router(client_ai_router)
app.include_router(client_company_router)
app.include_router(client_team_router)
app.include_router(client_audit_router)

# Public Routers (Candidate Experience)
from app.routers.public import router as public_router
app.include_router(public_router)

# Public Portal (Unique Client Links)
from app.routers.portal import router as portal_router
app.include_router(portal_router)

# Candidate Portal (Authenticated Candidate Experience)
from app.routers.candidate_portal import router as candidate_portal_router
app.include_router(candidate_portal_router)


# ── CV View endpoint (used by client dashboard iframe preview) ──────────
from fastapi import Path as PathParam, Query as QueryParam
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.cv import CVUpload
from sqlalchemy import select
from typing import Optional


@app.get("/api/cv/{cv_id}/view")
async def view_cv_file(
    cv_id: int = PathParam(...),
    token: Optional[str] = QueryParam(None, description="JWT token for iframe access"),
    db: AsyncSession = Depends(get_db),
):
    """
    Serve a CV file for preview in iframes.
    Accepts JWT token via ?token= query param (iframes can't send Authorization headers).
    For R2-stored files: redirects to presigned URL.
    For legacy local files: serves directly.
    """
    from app.utils.auth import verify_token as _verify_token

    # Verify token from query param
    if not token:
        return JSONResponse(status_code=401, content={"detail": "Token required"})

    payload = _verify_token(token, token_type="access")
    if not payload:
        return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})

    import os as _os2
    result = await db.execute(select(CVUpload).where(CVUpload.id == cv_id))
    cv = result.scalar_one_or_none()
    if not cv:
        return JSONResponse(status_code=404, content={"detail": "CV not found"})

    if not cv.storage_path:
        return JSONResponse(status_code=404, content={"detail": "No file path"})

    # R2 file — redirect to presigned URL
    if not cv.storage_path.startswith("uploads/") and not cv.storage_path.startswith("/"):
        try:
            from app.services.r2_storage import generate_presigned_url
            url = generate_presigned_url(cv.storage_path, expiry_seconds=3600)
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=url)
        except Exception as e:
            logger.error(f"CV view R2 error: {e}")
            return JSONResponse(status_code=500, content={"detail": "Failed to generate download URL"})

    # Legacy local file — serve directly
    if _os2.path.exists(cv.storage_path):
        from fastapi.responses import FileResponse
        content_type = "application/pdf" if cv.storage_path.endswith(".pdf") else "application/octet-stream"
        return FileResponse(
            cv.storage_path,
            filename=cv.original_filename or "cv.pdf",
            media_type=content_type,
            headers={"Content-Disposition": "inline"},
        )

    return JSONResponse(status_code=404, content={"detail": "File not found on disk"})


# Serve uploaded logos and static assets
import os as _os
from fastapi.staticfiles import StaticFiles
_logos_dir = _os.path.join(_os.path.dirname(_os.path.dirname(__file__)), "uploads", "logos")
_os.makedirs(_logos_dir, exist_ok=True)
app.mount("/static/logos", StaticFiles(directory=_logos_dir), name="logos")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "TRM Platform API",
        "version": "0.1.0",
        "status": "running",
        "docs": "/api/docs"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "version": "0.1.0"
    }


@app.get("/api/auth/test-token")
async def test_token_generation():
    """Test endpoint to generate a sample JWT token"""
    sample_payload = {
        "user_id": 1,
        "user_type": "super_admin",
        "email": "admin@trmplatform.com"
    }

    access_token = create_access_token(sample_payload)

    return {
        "message": "Sample JWT token generated",
        "access_token": access_token,
        "token_type": "bearer",
        "payload": sample_payload,
        "note": "Use this token in the Authorization header as: Bearer {token}"
    }


@app.get("/api/auth/me")
async def get_me(current_user: Dict[str, Any] = Depends(require_auth)):
    """Protected endpoint - returns current user info"""
    return {
        "message": "Authentication successful",
        "user": {
            "user_id": current_user.get("user_id"),
            "user_type": current_user.get("user_type"),
            "email": current_user.get("email")
        }
    }


@app.get("/api/test/hash")
async def test_password_hash():
    """Test endpoint to demonstrate password hashing"""
    test_password = "SecurePassword123!"
    hashed = hash_password(test_password)

    return {
        "message": "Password hashing test",
        "original": test_password,
        "hashed": hashed,
        "note": "Never expose actual passwords in production!"
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
