import asyncio
from app.database import get_db

async def test():
    try:
        gen = get_db()
        session = await gen.__anext__()
        print("Connected to session")
        await session.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
