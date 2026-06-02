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
from app.services.modulbank import ModulBankService

router = APIRouter(tags=["payments"])


@router.post("/create-payment")
async def create_payment(
    data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    booking_id = data.get("booking_id")
    amount = data.get("amount")
    description = data.get("description", f"Бронирование #{booking_id}")
    client_name = data.get("client_name", "")
    client_phone = data.get("client_phone", "")
    client_email = data.get("client_email", "")

    result = await db.execute(
        text("""
            SELECT bt.manager_id, pa.bank, pa.merchant_id, pa.secret_key, pa.test_mode
            FROM bookings b
            JOIN boats bt ON b.boat_id = bt.id
            LEFT JOIN managers m ON bt.manager_id = m.id
            LEFT JOIN payment_accounts pa ON m.payment_account_id = pa.id
            WHERE b.id = :booking_id
        """),
        {"booking_id": booking_id}
    )
    row = result.fetchone()
    
    if not row:
        return {"success": False, "error": "Booking not found"}

    manager_id, bank, merchant_id, secret_key, test_mode = row
    
    if not bank:
        bank = "test"

    base_url = str(request.base_url).rstrip("/")
    callback_url = f"{base_url}/api/webhook/modulbank"
    order_id = f"{booking_id}_{int(datetime.now().timestamp())}"

    if bank == "modulbank" and merchant_id and secret_key:
        service = ModulBankService(merchant_id, secret_key, test_mode if test_mode is not None else True)
        payment = await service.create_payment(
            amount=amount,
            order_id=order_id,
            description=description,
            client_name=client_name,
            client_phone=client_phone,
            client_email=client_email,
            callback_url=callback_url,
            redirect_url=f"{base_url}/booking/{booking_id}/success"
        )
    else:
        # Тестовый режим — сразу подтверждаем
        booking_id_int = int(booking_id)
        await db.execute(
            text("UPDATE bookings SET status = 'active' WHERE id = :id"),
            {"id": booking_id_int}
        )
        await db.commit()
        
        # Push-уведомление менеджеру
        try:
            from app.api.push_api import send_push_internal
            info = await db.execute(
                text("SELECT bo.name, bo.manager_id, b.client_name, b.booking_date, b.start_time FROM boats bo JOIN bookings b ON b.boat_id = bo.id WHERE b.id = :bid"),
                {"bid": booking_id_int}
            )
            row = info.fetchone()
            if row:
                # Менеджеру
                await send_push_internal(
                    db=db,
                    title=f"🆕 Новая бронь #{booking_id_int}",
                    body=f"{row[2] or 'Клиент'}, {row[0]}, {row[3]} {row[4]}",
                    url=f"/bookings/{booking_id_int}",
                    user_type="manager",
                    user_id=str(row[1])
                )
                # Клиенту
                await send_push_internal(
                    db=db,
                    title="✅ Бронирование подтверждено",
                    body=f"{row[0]}, {row[3]} в {row[4]}",
                    url=f"/booking/{booking_id_int}",
                    user_type="client",
                    user_id="guest"
                )
        except Exception as e:
            print(f"⚠️ Ошибка push: {e}")

        payment = {
            "payment_id": f"test_{order_id}",
            "payment_url": None,
            "status": "success"
        }

    return {"success": True, **payment}


@router.get("/test-payment-page/{order_id}")
async def test_payment_page(order_id: str, amount: float = 0):
    return HTMLResponse(f"""
    <html><head><meta charset="utf-8"><title>Тестовый платёж</title>
    <style>body{{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5;}}
    .card{{background:white;padding:40px;border-radius:16px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.1);}}
    button{{padding:12px 30px;font-size:18px;border:none;border-radius:8px;cursor:pointer;margin:10px;}}
    .ok{{background:#10b981;color:white;}}.fail{{background:#ef4444;color:white;}}</style></head>
    <body><div class="card"><h2>🧪 Тестовый платёж</h2>
    <p>Заказ: {order_id}</p><p>Сумма: {amount} ₽</p>
    <button class="ok" onclick="pay('success')">✅ Оплатить</button>
    <button class="fail" onclick="pay('failed')">❌ Отмена</button>
    </div><script>
        async function pay(r){{
        await fetch('/api/test-payment/confirm?order_id={order_id}&result='+r, {{method:'POST'}});
        alert(r==='success'?'Оплачено!':'Отменено');
    }}
    </script></body></html>""")


@router.post("/test-payment/confirm")
async def confirm_test_payment(
    order_id: str,
    result: str = "success",
    db: AsyncSession = Depends(get_db)
):
    booking_id = order_id.split("_")[0]
    
    if result == "success":
        await db.execute(
            text("UPDATE bookings SET status = 'active' WHERE id = :id"),
            {"id": int(booking_id)}
        )
        await db.commit()
        return {"success": True, "message": "Оплата подтверждена"}
    
    return {"success": False, "message": "Оплата отменена"}