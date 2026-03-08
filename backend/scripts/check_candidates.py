
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
from app.models.candidate import Candidate
from app.models.candidate import Applicant

async def check_candidates():
    async with AsyncSessionLocal() as session:
        # Check Candidates
        candidate_stmt = select(Candidate)
        result = await session.execute(candidate_stmt)
        candidates = result.scalars().all()
        
        print(f"Total Candidates: {len(candidates)}")
        for c in candidates:
            print(f"- ID: {c.id}, Name: {c.name}, Email: {c.email}, Skills: {c.skills}")
            
        # Check Applicants
        applicant_stmt = select(Applicant)
        result = await session.execute(applicant_stmt)
        applicants = result.scalars().all()
        
        print(f"Total Applicants: {len(applicants)}")
        for a in applicants:
            print(f"- App ID: {a.id}, Cand ID: {a.candidate_id}, Job ID: {a.requirement_id}, Status: {a.status}")

if __name__ == "__main__":
    asyncio.run(check_candidates())
