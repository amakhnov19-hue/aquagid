import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import engine, Base
from app.models.manager_model import Manager
from app.models.boat_model import Boat
from app.models.booking_model import Booking
from app.models.settings_model import Settings

async def create_tables():
    print("Создание таблиц в базе данных...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Таблицы успешно созданы!")

if __name__ == "__main__":
    asyncio.run(create_tables())