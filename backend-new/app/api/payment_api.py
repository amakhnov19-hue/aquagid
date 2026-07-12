"""
Единый API для приёма платежей.
Определяет банк менеджера и вызывает нужный сервис.
"""

from datetime import datetime
from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.services import tbank

router = APIRouter(tags=["payments"])


@router.post("/create-payment")
async def create_payment(
    data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    booking_id = int(data.get("booking_id", 0))
    amount = data.get("amount")
    description = data.get("description", f"Бронирование #{booking_id}")
    client_name = data.get("client_name", "")
    client_phone = data.get("client_phone", "")
    client_email = data.get("client_email", "")

    result = await db.execute(
        text("""
            SELECT bt.manager_id, COALESCE(pa.bank, 'test') as bank, pa.merchant_id, pa.secret_key, pa.test_mode
            FROM bookings b
            JOIN boats bt ON b.boat_id = bt.id
            LEFT JOIN managers m ON bt.manager_id = m.id
            LEFT JOIN payment_accounts pa ON m.payment_account_id = pa.id
            WHERE b.id = :booking_id
        """),
        {"booking_id": booking_id}
    )
    row = result.fetchone()
    print(f"🔍 CREATE PAYMENT: booking_id={booking_id}, amount={amount}", flush=True)
    
    if not row:
        return {"success": False, "error": "Booking not found"}

    manager_id, bank, merchant_id, secret_key, test_mode = row
    print(f"🔍 BANK CHECK: bank={bank}, merchant={merchant_id}, secret={secret_key[:10] if secret_key else 'None'}", flush=True)
    
    if not bank:
        bank = "test"

    base_url = str(request.base_url).rstrip("/")
    callback_url = ""
    order_id = f"{booking_id}_{int(datetime.now().timestamp())}"

    print(f"🔍 PAYMENT CHECK: bank={bank}, merchant={merchant_id}, secret={secret_key[:10] if secret_key else 'None'}", flush=True)
    print(f"🔍 PAYMENT: bank={bank}, merchant={merchant_id}, secret_len={len(secret_key) if secret_key else 0}", flush=True)    

    if bank == "tbank" and merchant_id and secret_key:
        amount_kopecks = int(amount)
        success_url = f"{base_url}?payment=success&booking={booking_id}"
        fail_url = f"{base_url}?payment=fail&booking={booking_id}"
        result = await tbank.init_payment(amount_kopecks, order_id, description, success_url, fail_url, client_email, merchant_id, secret_key)
        if result.get("success"):
            return result
        return {"success": False, "error": result.get("error", "TBank error")}
    else:
        return {"success": False, "error": "Payment method not configured"}

@router.post("/test-booking")
async def create_test_booking(
    db: AsyncSession = Depends(get_db)
):
    """Создать тестовое бронирование с имитацией оплаты"""
    from datetime import date, time
    import random
    
    # Создаём бронь напрямую
    result = await db.execute(
        text("""
            INSERT INTO bookings (boat_id, booking_date, start_time, duration_minutes, 
                client_name, client_phone, client_email, status, total_price, prepayment_amount)
            VALUES (:boat_id, :booking_date, :start_time, :duration, 
                :client_name, :client_phone, :client_email, 'active', 1000, 150)
            RETURNING id
        """),
        {
            "boat_id": 18,
            "booking_date": date.today(),
            "start_time": time(random.randint(15, 21), 0),
            "duration": 60,
            "client_name": "Тест",
            "client_phone": "+79999999999",
            "client_email": "test@test.com"
        }
    )
    booking_id = result.scalar()
    await db.commit()
    
    # Экспорт в Google Calendar
    from app.services.sync.google_calendar import google_service
    try:
        export_result = await google_service.export_booking(booking_id)
        return {"success": True, "booking_id": booking_id, "export": export_result}
    except Exception as e:
        return {"success": True, "booking_id": booking_id, "export_error": str(e)}
