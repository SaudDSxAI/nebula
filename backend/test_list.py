import asyncio
from sqlalchemy import select, func, desc
from app.database import async_session_maker
from app.models.client import Client

async def view_clients():
    async with async_session_maker() as session:
        query = select(Client).where(Client.deleted_at.is_(None)).order_by(desc(Client.created_at)).limit(5)
        result = await session.execute(query)
        clients = result.scalars().all()
        for idx, client in enumerate(clients):
            print(f"[{idx}] {client.company_name} - {client.email}")
            for key, val in client.__dict__.items():
                if not key.startswith("_"):
                    print(f"  {key}: {type(val)} - {val}")

if __name__ == "__main__":
    asyncio.run(view_clients())
