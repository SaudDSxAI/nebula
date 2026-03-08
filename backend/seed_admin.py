"""
Seed script to create a default super admin account
Run: python seed_admin.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.models.super_admin import SuperAdmin
from app.utils.auth import hash_password
from app.config import settings
from datetime import datetime


async def seed_super_admin():
    """Create a default super admin account"""

    # Create async engine
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if super admin already exists
        from sqlalchemy import select
        result = await session.execute(
            select(SuperAdmin).where(SuperAdmin.email == "admin@trmplatform.com")
        )
        existing_admin = result.scalar_one_or_none()

        if existing_admin:
            print("✅ Super admin already exists!")
            print(f"   Email: {existing_admin.email}")
            print(f"   Name: {existing_admin.name}")
            return

        # Create new super admin
        admin = SuperAdmin(
            email="admin@trmplatform.com",
            password_hash=hash_password("Admin123!"),  # Default password
            name="Super Administrator",
            phone="+1234567890",
            role="super_admin",
            two_factor_enabled=False,
            failed_login_attempts=0,
            created_at=datetime.utcnow()
        )

        session.add(admin)
        await session.commit()
        await session.refresh(admin)

        print("\n🎉 Super admin account created successfully!")
        print("=" * 60)
        print(f"📧 Email:    admin@trmplatform.com")
        print(f"🔐 Password: Admin123!")
        print(f"👤 Name:     {admin.name}")
        print(f"🆔 ID:       {admin.id}")
        print("=" * 60)
        print("\n⚠️  IMPORTANT: Change the password after first login!\n")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_super_admin())
