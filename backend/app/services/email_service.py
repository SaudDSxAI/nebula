"""
Email Service — SMTP-based email notifications for TRM Platform.
Supports: Assignment alerts, OTP verification, daily digest, portal invites.
"""
import os
import random
import smtplib
import asyncio
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List

from app.config import settings

logger = logging.getLogger(__name__)

SMTP_HOST = settings.SMTP_HOST or os.getenv("SMTP_HOST", "")
SMTP_PORT = settings.SMTP_PORT or int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = settings.SMTP_USER or os.getenv("SMTP_USER", "")
SMTP_PASSWORD = settings.SMTP_PASSWORD or os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = settings.SMTP_FROM_EMAIL or os.getenv("FROM_EMAIL", "") or SMTP_USER
FROM_NAME = os.getenv("FROM_NAME", "TRM Platform")
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "false").lower() == "true"


def is_email_configured() -> bool:
    """Check if email is properly configured."""
    return bool(EMAIL_ENABLED and SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


# ═══════════════════════════════════════════════
# CORE SEND FUNCTION
# ═══════════════════════════════════════════════

def _send_email_sync(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None):
    """Send an email synchronously (called in thread pool)."""
    if not is_email_configured():
        logger.warning(f"Email not configured — skipping email to {to_email}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg["To"] = to_email

        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.sendmail(FROM_EMAIL, to_email, msg.as_string())

        logger.info(f"✅ Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"❌ Email failed to {to_email}: {e}")
        return False


async def send_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None):
    """Send email asynchronously (non-blocking)."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _send_email_sync, to_email, subject, html_body, text_body)


# ═══════════════════════════════════════════════
# EMAIL TEMPLATES
# ═══════════════════════════════════════════════

def _base_template(content: str) -> str:
    """Wrap content in the base email template."""
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
        <tr><td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden;">
                <!-- Header -->
                <tr><td style="background:linear-gradient(135deg,#0274BD,#026099);padding:24px 32px;">
                    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">{FROM_NAME}</h1>
                </td></tr>
                <!-- Content -->
                <tr><td style="padding:32px;">
                    {content}
                </td></tr>
                <!-- Footer -->
                <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#94a3b8;">
                        © 2026 {FROM_NAME}. All rights reserved.
                    </p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>"""


# ═══════════════════════════════════════════════
# NOTIFICATION: Email Verification OTP
# ═══════════════════════════════════════════════

def generate_otp() -> str:
    """Generate a 6-digit OTP code."""
    return str(random.randint(100000, 999999))


async def send_verification_otp(to_email: str, otp_code: str, candidate_name: str = ""):
    """Send a 6-digit OTP code for email verification."""
    greeting = f"Hi {candidate_name}," if candidate_name else "Hi,"

    content = f"""
        <h2 style="margin:0 0 16px;font-size:22px;color:#1c1917;">Verify Your Email</h2>
        <p style="color:#57534e;font-size:15px;line-height:1.6;">{greeting}</p>
        <p style="color:#57534e;font-size:15px;line-height:1.6;">
            Please use the following verification code to complete your registration:
        </p>
        <div style="text-align:center;margin:28px 0;">
            <div style="display:inline-block;background:#f1f5f9;border:2px dashed #0274BD;border-radius:12px;padding:16px 40px;">
                <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0274BD;font-family:'Courier New',monospace;">
                    {otp_code}
                </span>
            </div>
        </div>
        <p style="color:#57534e;font-size:14px;line-height:1.6;">
            This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
            If you didn't request this, you can safely ignore this email.
        </p>
    """
    html = _base_template(content)
    await send_email(to_email, f"Your verification code: {otp_code}", html)


# ═══════════════════════════════════════════════
# NOTIFICATION: Requirement Assignment
# ═══════════════════════════════════════════════

async def notify_requirement_assigned(
    user_email: str,
    user_name: str,
    requirement_id: int,
    requirement_name: str,
    company_name: str,
    role_title: str,
    location: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_by: Optional[str] = None,
    dashboard_url: Optional[str] = None,
):
    """Send email notification when a user is assigned to a requirement."""
    content = f"""
        <h2 style="margin:0 0 16px;font-size:22px;color:#1c1917;">New Requirement Assignment</h2>
        <p style="color:#57534e;font-size:15px;line-height:1.6;">
            Hi {user_name},<br/>
            You have been assigned to a new requirement{f' by {assigned_by}' if assigned_by else ''}.
        </p>
        <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:20px 0;border-left:4px solid #0274BD;">
            <h3 style="margin:0 0 8px;color:#1c1917;">{requirement_name}</h3>
            <p style="margin:4px 0;font-size:14px;color:#57534e;">
                <strong>Company:</strong> {company_name}<br/>
                <strong>Role:</strong> {role_title}<br/>
                {f'<strong>Location:</strong> {location}<br/>' if location else ''}
                {f'<strong>Priority:</strong> {priority}<br/>' if priority else ''}
                <strong>Req ID:</strong> #{requirement_id}
            </p>
        </div>
        {f'<a href="{dashboard_url}" style="display:inline-block;padding:12px 24px;background:#0274BD;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View Requirement →</a>' if dashboard_url else ''}
    """
    html = _base_template(content)
    await send_email(user_email, f"New Assignment: {requirement_name}", html)


# ═══════════════════════════════════════════════
# NOTIFICATION: Requirement Unassigned
# ═══════════════════════════════════════════════

async def notify_requirement_unassigned(
    user_email: str,
    user_name: str,
    requirement_id: int,
    requirement_name: str,
):
    """Send email when a user is removed from a requirement."""
    content = f"""
        <h2 style="margin:0 0 16px;font-size:22px;color:#1c1917;">Requirement Update</h2>
        <p style="color:#57534e;font-size:15px;line-height:1.6;">
            Hi {user_name},<br/>
            You have been unassigned from requirement <strong>{requirement_name}</strong> (#{requirement_id}).
        </p>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
            If you have questions, please contact your team admin.
        </p>
    """
    html = _base_template(content)
    await send_email(user_email, f"Unassigned: {requirement_name}", html)


# ═══════════════════════════════════════════════
# NOTIFICATION: Pending Requirements Digest
# ═══════════════════════════════════════════════

async def notify_pending_requirements(
    user_email: str,
    user_name: str,
    requirements: List[dict],
    dashboard_url: str,
):
    """Send daily digest of pending requirements assigned to a user."""
    if not requirements:
        return

    rows_html = ""
    for req in requirements:
        rows_html += f"""
        <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;">
                <strong>{req.get('name', 'Untitled')}</strong>
                <div style="font-size:12px;color:#94a3b8;">#{req.get('id', '-')}</div>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#57534e;">
                {req.get('status', 'Pending')}
            </td>
        </tr>"""

    content = f"""
        <h2 style="margin:0 0 16px;font-size:22px;color:#1c1917;">
            📋 Pending Requirements Digest
        </h2>
        <p style="color:#57534e;font-size:15px;line-height:1.6;">
            Good morning {user_name}, you have <strong>{len(requirements)}</strong> pending requirement(s):
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr style="background:#f8fafc;">
                <th style="padding:10px 12px;text-align:left;font-size:13px;color:#64748b;">Requirement</th>
                <th style="padding:10px 12px;text-align:left;font-size:13px;color:#64748b;">Status</th>
            </tr>
            {rows_html}
        </table>
        <a href="{dashboard_url}" style="display:inline-block;padding:12px 24px;background:#0274BD;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
            View Dashboard →
        </a>
    """
    html = _base_template(content)
    await send_email(user_email, f"📋 {len(requirements)} Pending Requirement(s)", html)


# ═══════════════════════════════════════════════
# NOTIFICATION: Portal Invite for Existing Candidates
# ═══════════════════════════════════════════════

async def send_portal_invite(to_email: str, candidate_name: str = "", invite_url: str = ""):
    """Send an invite email to an existing candidate to set up their portal account."""
    greeting = f"Hi {candidate_name}," if candidate_name else "Hi,"

    content = f"""
        <h2 style="margin:0 0 16px;font-size:22px;color:#1c1917;">You're Invited!</h2>
        <p style="color:#57534e;font-size:15px;line-height:1.6;">{greeting}</p>
        <p style="color:#57534e;font-size:15px;line-height:1.6;">
            Your profile has been created. Click below to set up your password and access your candidate portal.
        </p>
        <div style="text-align:center;margin:28px 0;">
            <a href="{invite_url}" style="display:inline-block;padding:14px 32px;background:#0274BD;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 4px 16px rgba(2,116,189,0.3);">
                Set Up Account →
            </a>
        </div>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
            This link expires in 7 days. If you didn't expect this, contact the recruitment team.
        </p>
    """
    html = _base_template(content)
    await send_email(to_email, "Set up your candidate portal account", html)
