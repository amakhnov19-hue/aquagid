"""
ModulBank Service — приём платежей через МодульБанк
API: https://api.modulbank.ru/
"""

import hashlib
import json
import os
from datetime import datetime
from typing import Optional, Dict, Any

import httpx
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db

# URL API
TEST_BASE_URL = "https://api.test.modulbank.ru/v1"
PROD_BASE_URL = "https://api.modulbank.ru/v1"


class ModulBankService:
    """Сервис для работы с API МодульБанка"""
    
    def __init__(self, merchant_id: str, secret_key: str, test_mode: bool = True):
        self.merchant_id = merchant_id
        self.secret_key = secret_key
        self.base_url = TEST_BASE_URL if test_mode else PROD_BASE_URL
    
    def _sign(self, data: dict) -> str:
        """Создать подпись запроса (SHA-256)"""
        data["merchant"] = self.merchant_id
        sign_string = "&".join(f"{k}={v}" for k, v in sorted(data.items()))
        return hashlib.sha256((sign_string + self.secret_key).encode()).hexdigest()
    
    async def create_payment(
        self,
        amount: float,
        order_id: str,
        description: str,
        client_name: str = "",
        client_phone: str = "",
        client_email: str = "",
        callback_url: str = "",
        redirect_url: str = ""
    ) -> Dict[str, Any]:
        """
        Создать платёж.
        
        Параметры:
        - amount: сумма в рублях
        - order_id: уникальный ID заказа
        - description: описание платежа
        - callback_url: URL для webhook
        - redirect_url: куда вернуть клиента после оплаты
        
        Возвращает:
        - payment_id: ID платежа
        - payment_url: URL для оплаты
        """
        data = {
            "amount": str(int(amount * 100)),  # копейки
            "order_id": order_id,
            "description": description[:250],
            "client_name": client_name[:150],
            "client_phone": client_phone,
            "client_email": client_email,
            "testing": "1" if "test" in self.base_url else "0",
        }
        
        if callback_url:
            data["callback_url"] = callback_url
        if redirect_url:
            data["redirect_url_on_success"] = redirect_url
            data["redirect_url_on_failed"] = redirect_url
        
        data["signature"] = self._sign(data)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/payments",
                json=data,
                headers={"Content-Type": "application/json"}
            )
            result = response.json()
            
            if response.status_code != 200:
                raise Exception(f"ModulBank error: {result.get('message', 'Unknown error')}")
            
            return {
                "payment_id": result.get("id"),
                "payment_url": result.get("payment_url"),
                "status": result.get("status")
            }
    
    async def get_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """Проверить статус платежа"""
        data = {"payment_id": payment_id}
        data["signature"] = self._sign(data)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/payments/{payment_id}",
                params=data
            )
            result = response.json()
            return {
                "payment_id": result.get("id"),
                "status": result.get("status"),
                "amount": result.get("amount"),
                "order_id": result.get("order_id")
            }
    
    def verify_webhook(self, data: dict) -> bool:
        """Проверить подпись webhook"""
        received_signature = data.pop("signature", None)
        expected_signature = self._sign(data)
        return received_signature == expected_signature


def get_payment_service_for_manager(manager_id: int, db) -> Optional[ModulBankService]:
    """Получить сервис оплаты для менеджера"""
    result = db.execute(
        text("""
            SELECT pa.merchant_id, pa.secret_key, pa.test_mode
            FROM managers m
            JOIN payment_accounts pa ON m.payment_account_id = pa.id
            WHERE m.id = :manager_id AND pa.is_active = true
        """),
        {"manager_id": manager_id}
    )
    row = result.fetchone()
    if not row:
        return None
    return ModulBankService(
        merchant_id=row[0],
        secret_key=row[1],
        test_mode=row[2]
    )


# ========== Webhook router ==========
router = APIRouter(tags=["modulbank"])


@router.post("/webhook/modulbank")
async def modulbank_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Принимает уведомления от МодульБанка"""
    data = await request.json()
    payment_id = data.get("payment_id")
    status = data.get("status")
    order_id = data.get("order_id")
    
    print(f"🔔 ModulBank webhook: payment={payment_id}, status={status}, order={order_id}")
    
    if status == "success":
        # Находим бронирование по order_id (booking_id + timestamp)
        booking_id = order_id.split("_")[0] if "_" in order_id else order_id
        
        await db.execute(
            text("UPDATE bookings SET status = 'active', paid_at = NOW() WHERE id = :id"),
            {"id": int(booking_id)}
        )
        await db.commit()
        print(f"✅ Booking {booking_id} оплачен через ModulBank")
    
    return {"success": True}