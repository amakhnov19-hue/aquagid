"""
T-Банк эквайринг — сервис для приёма платежей
"""

import hashlib
import os
import json
import aiohttp
from fastapi import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from fastapi import Depends
from sqlalchemy import text
from fastapi.responses import PlainTextResponse

router = APIRouter(tags=["tbank"])

# Ключи из .env
TBANK_TERMINAL_KEY = os.getenv("TBANK_TERMINAL_KEY")
if not TBANK_TERMINAL_KEY:
    raise ValueError("TBANK_TERMINAL_KEY не задан в переменных окружения!")
TBANK_PASSWORD = os.getenv("TBANK_PASSWORD")
if not TBANK_PASSWORD:
    raise ValueError("TBANK_PASSWORD не задан в переменных окружения!")
TBANK_API_URL = "https://securepay.tinkoff.ru/v2/Init"


def generate_token(params: dict, password: str = None) -> str:
    pwd = password or TBANK_PASSWORD
    
    # Копируем params и добавляем Password только для подписи
    token_params = {k: str(v).lower() if isinstance(v, bool) else str(v) for k, v in params.items() if k not in ("Token", "Receipt", "DATA")}
    token_params["Password"] = pwd
    
    sorted_keys = sorted(token_params.keys())
    token_str = "".join(token_params[k] for k in sorted_keys)
    
    print(f"🔍 TOKEN KEYS: {sorted_keys}", flush=True)
    print(f"🔍 TOKEN STRING: {token_str}", flush=True)
    return hashlib.sha256(token_str.encode()).hexdigest()


async def init_payment(amount_kopecks: int, order_id: str, description: str = "Бронирование катера", 
                       success_url: str = None, fail_url: str = None, client_email: str = "",
                       terminal_key: str = None, password: str = None) -> dict:
    
    params = {
        "TerminalKey": terminal_key or TBANK_TERMINAL_KEY,
        "Amount": str(amount_kopecks),
        "OrderId": order_id,
        "Description": description,
        "Language": "ru",
        "PayType": "O",
    }

    if success_url:
        params["SuccessURL"] = success_url
    if fail_url:
        params["FailURL"] = fail_url
    
    try:
        params["Receipt"] = {
            "Email": client_email or "client@example.com",
            "Taxation": "usn_income",
            "Items": [{"Name": description, "Price": amount_kopecks, "Quantity": 1, "Amount": amount_kopecks, "Tax": "none"}]
        }
    except Exception as e:
        print(f"🔍 RECEIPT ERROR: {e}", flush=True)

    print(f"🔍 INIT_PAYMENT password: {password[:5]}...", flush=True)
    params["Token"] = generate_token(params, password)
    print(f"🔍 TBANK FULL PARAMS: {params}", flush=True)
    
    async with aiohttp.ClientSession() as session:
        async with session.post(TBANK_API_URL, json=params) as resp:
            data = await resp.json()
            print(f"🔍 TBANK RESPONSE: {data}", flush=True)
            if data.get("Success"):
                return {
                    "success": True,
                    "payment_url": data["PaymentURL"],
                    "payment_id": data.get("PaymentId"),
                    "order_id": order_id
                }
            return {
                "success": False,
                "error": data.get("Message", "Unknown error"),
                "details": data.get("Details", "")
            }


@router.post("/webhook/tbank")
async def tbank_webhook(data: dict, db: AsyncSession = Depends(get_db)):
    """Уведомление от Т-банка о статусе платежа"""
    print(f"🔍 WEBHOOK RECEIVED: {data}", flush=True)
    
    token = data.pop("Token", "")
    terminal_key = data.get("TerminalKey", "")
    
    # Ищем пароль по TerminalKey
    result = await db.execute(
        text("SELECT secret_key FROM payment_accounts WHERE merchant_id = :tid"),
        {"tid": terminal_key}
    )
    row = result.fetchone()
    password = row[0] if row else TBANK_PASSWORD
    print(f"🔍 WEBHOOK PASSWORD: {password[:5]}...", flush=True)
    
    expected = generate_token(data, password)
    
    print(f"🔍 WEBHOOK TOKEN: expected={expected[:10]}..., got={token[:10]}...", flush=True)
    
    if token != expected:
        print(f"🔍 WEBHOOK: Invalid token", flush=True)
        return PlainTextResponse("ERROR: Invalid token")
    
    status = data.get("Status", "")
    print(f"🔍 WEBHOOK STATUS: {status}", flush=True)
    order_id = data.get("OrderId", "")
    payment_id = data.get("PaymentId", "")
    
    try:
        booking_id = int(order_id.split("_")[0]) if "_" in order_id else int(order_id)

        # Проверяем, существует ли бронь
        result = await db.execute(
            text("SELECT id FROM bookings WHERE id = :bid"),
            {"bid": booking_id}
        )
        if not result.fetchone():
            print(f"🔍 WEBHOOK: Booking {booking_id} not found, skipping", flush=True)
            return PlainTextResponse("OK")        
    except:
        return PlainTextResponse("ERROR: Invalid OrderId")

    # Проверяем, не обработана ли уже бронь
    existing = await db.execute(
        text("SELECT status FROM bookings WHERE id = :bid AND status = 'active'"),
        {"bid": booking_id}
    )
    if existing.fetchone():
        print(f"🔍 WEBHOOK: Booking {booking_id} already active, skipping", flush=True)
        return PlainTextResponse("OK")

    # Проверяем, не обработан ли уже этот payment_id
    existing_payment = await db.execute(
        text("SELECT id FROM bookings WHERE payment_id = :pid AND status = 'active'"),
        {"pid": str(payment_id)}
    )
    if existing_payment.fetchone():
        print(f"🔍 WEBHOOK: Payment {payment_id} already processed, skipping", flush=True)
        return PlainTextResponse("OK")    
    
    if status == "CONFIRMED":
        # Сохраняем payment_id
        await db.execute(
            text("UPDATE bookings SET payment_id = :pid WHERE id = :bid"),
            {"pid": str(payment_id), "bid": booking_id}
        )
        await db.commit()
        
        from app.api.bookings import confirm_payment
        await confirm_payment(booking_id, db)
        
    elif status == "REJECTED":
        # Платёж отклонён
        await db.execute(
            text("UPDATE bookings SET status = 'cancelled' WHERE id = :bid"),
            {"bid": booking_id}
        )
        await db.commit()
        
    elif status == "REFUNDED":
        # Возврат
        await db.execute(
            text("UPDATE bookings SET status = 'refunded' WHERE id = :bid"),
            {"bid": booking_id}
        )
        await db.commit()
    
    return PlainTextResponse("OK")