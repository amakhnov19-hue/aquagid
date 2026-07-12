"""
T-Банк эквайринг — сервис для приёма платежей
"""

import hashlib
import os
import aiohttp
from fastapi import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from fastapi import Depends

router = APIRouter(tags=["tbank"])

# Ключи из .env
TBANK_TERMINAL_KEY = os.getenv("TBANK_TERMINAL_KEY", "178**********DEMO")
TBANK_PASSWORD = os.getenv("TBANK_PASSWORD", "SGi***********E^")
TBANK_API_URL = "https://securepay.tinkoff.ru/v2/Init"


def generate_token(params: dict, password: str = None) -> str:
    token_params = {k: str(v) for k, v in params.items() if k not in ("Token", "DATA", "Receipt", "SuccessURL", "FailURL")}
    print(f"🔍 GENERATE_TOKEN password: {password[:5]}...", flush=True)    
    token_params["Password"] = password or TBANK_PASSWORD
    
    # Сортируем по ключу
    sorted_keys = sorted(token_params.keys())
    
    # Конкатенируем только значения
    token_str = "".join(token_params[k] for k in sorted_keys)
    print(f"🔍 TOKEN STRING: {token_str}", flush=True)    
    
    # SHA-256
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
    
    # Проверяем подпись
    token = data.pop("Token", "")
    params = {k: str(v) for k, v in data.items() if k not in ("Token", "DATA", "Receipt")}
    params["Password"] = TBANK_PASSWORD
    sorted_keys = sorted(params.keys())
    expected = hashlib.sha256("".join(params[k] for k in sorted_keys).encode()).hexdigest()
    
    if token != expected:
        return "ERROR: Invalid token"
    
    status = data.get("Status", "")
    order_id = data.get("OrderId", "")
    payment_id = data.get("PaymentId", "")
    
    try:
        booking_id = int(order_id.split("_")[1]) if "_" in order_id else int(order_id)
    except:
        return "ERROR: Invalid OrderId"
    
    if status == "CONFIRMED":
        # Платёж подтверждён
        await db.execute(
            text("UPDATE bookings SET status = 'active', payment_id = :pid WHERE id = :bid"),
            {"pid": str(payment_id), "bid": booking_id}
        )
        await db.commit()
        
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
    
    return "OK"