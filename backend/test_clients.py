import asyncio
from sqlalchemy import select, func, desc
from app.database import async_session_maker
from app.models.client import Client

async def test():
    try:
        async with async_session_maker() as session:
            query = select(Client).where(Client.deleted_at.is_(None)).order_by(desc(Client.created_at)).limit(5)
            result = await session.execute(query)
            clients = result.scalars().all()
            print("Successfully fetched clients:")
            for c in clients:
                print(c.company_name)
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test())
