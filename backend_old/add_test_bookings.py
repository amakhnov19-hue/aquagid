import asyncio
import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.booking_model import Booking
from app.models.boat_model import Boat
from app.models.manager_model import Manager
from sqlalchemy import select

async def add_test_bookings():
    async with AsyncSessionLocal() as db:
        # Получаем все катера
        result = await db.execute(select(Boat))
        boats = result.scalars().all()
        
        if not boats:
            print("❌ Нет катеров в базе. Сначала добавьте катера.")
            return
        
        print(f"✅ Найдено катеров: {len(boats)}")
        
        # Тестовые бронирования
        today = datetime.now()
        test_bookings = [
            {
                "date": today + timedelta(days=1),
                "duration": 120,
                "client_name": "Алексей Петров",
                "client_phone": "+79991112233",
                "client_email": "alexey@example.com",
                "total_amount": 5000,
                "prepayment_percent": 20,
                "prepayment_amount": 1000,
                "status": "confirmed"
            },
            {
                "date": today + timedelta(days=2, hours=3),
                "duration": 180,
                "client_name": "Елена Смирнова",
                "client_phone": "+79992223344",
                "client_email": "elena@example.com",
                "total_amount": 3500,
                "prepayment_percent": 15,
                "prepayment_amount": 525,
                "status": "confirmed"
            },
            {
                "date": today - timedelta(days=1),
                "duration": 90,
                "client_name": "Дмитрий Козлов",
                "client_phone": "+79993334455",
                "client_email": "dmitry@example.com",
                "total_amount": 7000,
                "prepayment_percent": 20,
                "prepayment_amount": 1400,
                "status": "completed"
            },
            {
                "date": today + timedelta(days=3),
                "duration": 240,
                "client_name": "Ольга Николаева",
                "client_phone": "+79994445566",
                "client_email": "olga@example.com",
                "total_amount": 4500,
                "prepayment_percent": 25,
                "prepayment_amount": 1125,
                "status": "confirmed"
            },
            {
                "date": today - timedelta(days=2),
                "duration": 150,
                "client_name": "Игорь Васильев",
                "client_phone": "+79995556677",
                "client_email": "igor@example.com",
                "total_amount": 6000,
                "prepayment_percent": 15,
                "prepayment_amount": 900,
                "status": "cancelled"
            }
        ]
        
        # Добавляем бронирования для разных катеров
        for i, booking_data in enumerate(test_bookings):
            boat = boats[i % len(boats)]
            booking = Booking(
                **booking_data,
                boat_id=boat.id,
                manager_id=boat.manager_id
            )
            db.add(booking)
            print(f"➕ Добавлено бронирование: {booking_data['client_name']} (катер ID: {boat.id})")
        
        await db.commit()
        print("✅ Все бронирования добавлены!")

if __name__ == "__main__":
    asyncio.run(add_test_bookings())
