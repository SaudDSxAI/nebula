
import asyncio
import sys
import os

# Adapt path (backend directory)
curr_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(curr_dir)
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.requirement import Requirement
from app.models.client import Client
from datetime import datetime

async def create_job():
    async with AsyncSessionLocal() as session:
        # Check if client exists
        result = await session.execute(select(Client).limit(1))
        client = result.scalar_one_or_none()
        
        if not client:
            print("No client found. Creating a dummy client...")
            client = Client(
                company_name="Acme Corp",
                email="test@acme.com",
                password_hash="dummy", 
                plan="enterprise",
                is_active=True
            )
            session.add(client)
            await session.commit()
            await session.refresh(client)
            print(f"Created Client ID: {client.id}")
        else:
            print(f"Using Client ID: {client.id}")

        req = Requirement(
            client_id=client.id,
            job_title="Senior AI Engineer",
            job_description="We are looking for an expert in LLMs and RAG systems.",
            required_skills="Python, PyTorch, LangChain, FastAPI",
            preferred_skills="Docker, Kubernetes",
            experience_level="senior",
            status="open",
            location="Remote",
            remote_type="remote",
            salary_range="$150k - $200k",
            created_at=datetime.utcnow()
        )
        session.add(req)
        await session.commit()
        await session.refresh(req)
        print(f"Created Job ID: {req.id}")

if __name__ == "__main__":
    asyncio.run(create_job())
