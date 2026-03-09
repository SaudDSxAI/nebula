import traceback, asyncio
from app.database import AsyncSessionLocal
from app.admin.clients import list_clients
import json

async def t():
    try:
        async with AsyncSessionLocal() as s:
            res = await list_clients(page=1, page_size=50, search=None, plan=None, status=None, sort_by='created_at', sort_order='desc', current_user={'user_id':1}, db=s)
            print(res.model_dump_json())
    except Exception as e:
        traceback.print_exc()

asyncio.run(t())
