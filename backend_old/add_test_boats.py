import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.boat_model import Boat
from app.models.manager_model import Manager
from sqlalchemy import select

async def add_test_boats():
    async with AsyncSessionLocal() as db:
        # Получаем существующих менеджеров
        result = await db.execute(select(Manager))
        managers = result.scalars().all()
        
        if not managers:
            print("❌ Нет менеджеров в базе. Сначала добавьте менеджеров.")
            return
        
        print(f"✅ Найдено менеджеров: {len(managers)}")
        
        # Тестовые катера
        test_boats = [
            {
                "name": "Марина",
                "description": "Комфортабельный катер для прогулок по морю",
                "price": 5000,
                "capacity": 6,
                "city": "Сочи",
                "status": "active",
                "subscription": True,
                "rating": 4.8,
                "popularity": 15
            },
            {
                "name": "Ветерок",
                "description": "Быстрый и маневренный катер",
                "price": 3500,
                "capacity": 4,
                "city": "Сочи",
                "status": "active",
                "subscription": False,
                "rating": 4.2,
                "popularity": 8
            },
            {
                "name": "Буря",
                "description": "Мощный катер для любителей скорости",
                "price": 7000,
                "capacity": 8,
                "city": "Адлер",
                "status": "blocked",
                "subscription": True,
                "rating": 3.8,
                "popularity": 2,
                "complaints": 5
            },
            {
                "name": "Чайка",
                "description": "Семейный катер с детским трапом",
                "price": 4500,
                "capacity": 5,
                "city": "Сочи",
                "status": "active",
                "subscription": False,
                "rating": 4.5,
                "popularity": 12
            },
            {
                "name": "Шторм",
                "description": "Катер для рыбалки и экскурсий",
                "price": 6000,
                "capacity": 7,
                "city": "Адлер",
                "status": "active",
                "subscription": True,
                "rating": 4.6,
                "popularity": 5
            }
        ]
        
        # Добавляем катера для каждого менеджера (по 1-2 катера)
        for i, boat_data in enumerate(test_boats):
            manager = managers[i % len(managers)]
            boat = Boat(
                **boat_data,
                manager_id=manager.id
            )
            db.add(boat)
            print(f"➕ Добавлен катер: {boat_data['name']} (менеджер ID: {manager.id})")
        
        await db.commit()
        print("✅ Все катера добавлены!")

if __name__ == "__main__":
    asyncio.run(add_test_boats())
