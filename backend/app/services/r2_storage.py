"""
Cloudflare R2 storage service for multi-tenant document management.

Directory structure in bucket:
    clients/{client_slug}/cvs/{candidate_id}/{uuid}.{ext}
    clients/{client_slug}/certifications/{candidate_id}/{name}_{uuid}.{ext}
    clients/{client_slug}/logos/{filename}.{ext}
"""

import boto3
import uuid
import logging
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# R2 CLIENT SINGLETON
# ---------------------------------------------------------------------------
_r2_client = None


def get_r2_client():
    """Lazy-initialise the boto3 S3-compatible client for Cloudflare R2."""
    global _r2_client
    if _r2_client is not None:
        return _r2_client

    if not settings.R2_ACCOUNT_ID or not settings.R2_ACCESS_KEY_ID:
        raise RuntimeError("R2 credentials are not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env")

    endpoint = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    _r2_client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
    logger.info(f"[R2] ✅ Client initialised for bucket: {settings.R2_BUCKET_NAME}")
    return _r2_client


# ---------------------------------------------------------------------------
# CONTENT TYPE HELPERS
# ---------------------------------------------------------------------------
CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".txt": "text/plain",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}


def _content_type(ext: str) -> str:
    return CONTENT_TYPES.get(ext.lower(), "application/octet-stream")


# ---------------------------------------------------------------------------
# CV OPERATIONS
# ---------------------------------------------------------------------------

def upload_cv(
    file_bytes: bytes,
    original_filename: str,
    client_slug: str,
    candidate_id: int,
) -> dict:
    """
    Upload a CV to R2.

    Returns:
        dict: {"object_key": str, "url": str|None}
    """
    import os
    ext = os.path.splitext(original_filename)[1].lower() or ".pdf"
    unique_id = uuid.uuid4().hex[:12]
    object_key = f"clients/{client_slug}/cvs/{candidate_id}/cv_{unique_id}{ext}"

    content_type = _content_type(ext)
    # PDFs can be previewed inline; others should download
    disposition = "inline" if ext == ".pdf" else f'attachment; filename="{original_filename}"'

    client = get_r2_client()
    try:
        client.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=object_key,
            Body=file_bytes,
            ContentType=content_type,
            ContentDisposition=disposition,
        )
        logger.info(f"[R2] ✅ CV uploaded: {object_key}")
    except ClientError as e:
        logger.error(f"[R2] ❌ CV upload failed: {e}")
        raise

    url = f"{settings.R2_PUBLIC_URL}/{object_key}" if settings.R2_PUBLIC_URL else None
    return {"object_key": object_key, "url": url}


def generate_presigned_url(object_key: str, expiry_seconds: int = 3600) -> str:
    """Generate a presigned (temporary) download URL for a private object."""
    client = get_r2_client()
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.R2_BUCKET_NAME, "Key": object_key},
            ExpiresIn=expiry_seconds,
        )
        return url
    except ClientError as e:
        logger.error(f"[R2] ❌ Presigned URL failed: {e}")
        raise


def delete_object(object_key: str) -> bool:
    """Delete a single object from R2."""
    client = get_r2_client()
    try:
        client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=object_key)
        logger.info(f"[R2] ✅ Deleted: {object_key}")
        return True
    except ClientError as e:
        logger.error(f"[R2] ❌ Delete failed: {e}")
        return False


def download_object(object_key: str) -> Optional[bytes]:
    """Download an object's bytes from R2."""
    client = get_r2_client()
    try:
        resp = client.get_object(Bucket=settings.R2_BUCKET_NAME, Key=object_key)
        return resp["Body"].read()
    except ClientError as e:
        logger.error(f"[R2] ❌ Download failed: {e}")
        return None


# ---------------------------------------------------------------------------
# GENERIC FILE UPLOAD (logos, certifications, etc.)
# ---------------------------------------------------------------------------

def upload_file(
    file_bytes: bytes,
    object_key: str,
    content_type: str = "application/octet-stream",
    disposition: str = "inline",
) -> dict:
    """Upload any file to a specific R2 key."""
    client = get_r2_client()
    try:
        client.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=object_key,
            Body=file_bytes,
            ContentType=content_type,
            ContentDisposition=disposition,
        )
        logger.info(f"[R2] ✅ File uploaded: {object_key}")
    except ClientError as e:
        logger.error(f"[R2] ❌ File upload failed: {e}")
        raise

    url = f"{settings.R2_PUBLIC_URL}/{object_key}" if settings.R2_PUBLIC_URL else None
    return {"object_key": object_key, "url": url}


def list_objects(prefix: str) -> list:
    """List objects under a prefix."""
    client = get_r2_client()
    try:
        resp = client.list_objects_v2(Bucket=settings.R2_BUCKET_NAME, Prefix=prefix)
        items = []
        for obj in resp.get("Contents", []):
            key = obj["Key"]
            items.append({
                "object_key": key,
                "filename": key.split("/")[-1],
                "size": obj.get("Size", 0),
                "last_modified": obj.get("LastModified"),
            })
        return items
    except ClientError as e:
        logger.error(f"[R2] ❌ List failed: {e}")
        return []
