"""
Telegram-уведомления для менеджеров.
Отправка при бронировании, отмене, сообщении от админа.
"""

import os
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.security import get_current_manager
from dotenv import load_dotenv
load_dotenv()


class TelegramService:
    def __init__(self):
        self.token = os.getenv("TELEGRAM_OFFICE_PROD_TOKEN")
        self.api_url = f"https://api.telegram.org/bot{self.token}"
    
    async def _send_message(self, chat_id: int, text: str) -> bool:
        """Отправить сообщение в Telegram"""
        if not self.token:
            print("❌ TELEGRAM_OFFICE_PROD_TOKEN не задан")
            return False
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.api_url}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": "HTML"
                    },
                    timeout=30.0,
                    headers={"Connection": "close"}
                )
                if response.status_code != 200:
                    print(f"❌ Telegram send error: {response.text}")
                    return False
                return True
            except Exception as e:
                import traceback
                print(f"❌ Telegram send failed: {e}")
                traceback.print_exc()
                return False
    
    async def get_chat_ids(self, manager_id: int, db: AsyncSession) -> list:
        """Получить все chat_id менеджера"""
        result = await db.execute(
            text("SELECT chat_id FROM manager_telegram WHERE manager_id = :mid AND is_active = true"),
            {"mid": manager_id}
        )
        return [row[0] for row in result.fetchall()]
    
    async def notify_booking(self, manager_id: int, booking_id: int, 
                              client_name: str, boat_name: str, 
                              date: str, time: str, amount: float,
                              db: AsyncSession):
        """Уведомление о новой брони"""
        chat_ids = await self.get_chat_ids(manager_id, db)
        text = (
            f"🆕 <b>Новая бронь!</b>\n\n"
            f"🚤 Катер: {boat_name}\n"
            f"👤 Клиент: {client_name}\n"
            f"📅 Дата: {date}\n"
            f"⏰ Время: {time}\n"
            f"💰 Предоплата: {amount} ₽\n"
            f"🔢 Бронь #{booking_id}"
        )
        for chat_id in chat_ids:
            await self._send_message(chat_id, text)
    
    async def notify_cancellation(self, manager_id: int, booking_id: int,
                                   client_name: str, boat_name: str,
                                   date: str, db: AsyncSession):
        """Уведомление об отмене брони"""
        chat_ids = await self.get_chat_ids(manager_id, db)
        text = (
            f"❌ <b>Отмена брони!</b>\n\n"
            f"🚤 Катер: {boat_name}\n"
            f"👤 Клиент: {client_name}\n"
            f"📅 Дата: {date}\n"
            f"🔢 Бронь #{booking_id}"
        )
        for chat_id in chat_ids:
            await self._send_message(chat_id, text)
    
    async def notify_admin_message(self, manager_id: int, message: str, db: AsyncSession):
        """Уведомление о сообщении от админа"""
        chat_ids = await self.get_chat_ids(manager_id, db)
        text = (
            f"💬 <b>Сообщение от поддержки</b>\n\n"
            f"{message}"
        )
        for chat_id in chat_ids:
            await self._send_message(chat_id, text)

from fastapi import APIRouter, Depends, Request
from app.core.database import get_db

router = APIRouter(tags=["telegram"])
# Импортируем сервис (после объявления класса)
# Синглтон будет ниже

@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Принимает сообщения от Telegram (нажатие Start)"""
    try:
        data = await request.json()
        print(f"📩 Telegram webhook: {data}")
        
        message = data.get("message", {})
        msg_text = message.get("text", "")
        chat = message.get("chat", {})
        chat_id = chat.get("id")
        
        if msg_text.startswith("/start") and chat_id:
            parts = msg_text.split(" ")
            if len(parts) > 1:
                manager_id = parts[1]
                
                await db.execute(
                    text("""
                        INSERT INTO manager_telegram (manager_id, chat_id)
                        VALUES (:mid, :chat_id)
                        ON CONFLICT (manager_id) DO UPDATE SET chat_id = :chat_id
                    """),
                    {"mid": int(manager_id), "chat_id": str(chat_id)}
                )
                await db.commit()
                
                token = os.getenv("TELEGRAM_OFFICE_PROD_TOKEN")
                if token:
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            f"https://api.telegram.org/bot{token}/sendMessage",
                            json={"chat_id": chat_id, "text": "✅ Уведомления AquaGid подключены!", "parse_mode": "HTML"},
                            timeout=10.0
                        )
                print(f"✅ Telegram подключён: manager={manager_id}, chat={chat_id}")
        
        return {"success": True}
    except Exception as e:
        import traceback
        import sys
        traceback.print_exc(file=sys.stdout)
        return {"success": False, "error": str(e)}

@router.post("/connect")
async def connect_telegram(
    data: dict,
    db: AsyncSession = Depends(get_db),
    manager = Depends(get_current_manager)
):
    """Привязать Telegram по chat_id (менеджер вводит вручную)"""
    manager_id = manager.get("sub")
    chat_id = data.get("chat_id")
    
    if not chat_id:
        raise HTTPException(status_code=400, detail="chat_id обязателен")
    
    await db.execute(
        text("""
            INSERT INTO manager_telegram (manager_id, chat_id)
            VALUES (:mid, :chat_id)
            ON CONFLICT (manager_id) DO UPDATE SET chat_id = :chat_id
        """),
        {"mid": int(manager_id), "chat_id": str(chat_id)}
    )
    await db.commit()
    return {"success": True, "message": "Telegram подключён"}


@router.get("/connect-link/{manager_id}")
async def get_connect_link(manager_id: int):
    """Получить ссылку для подключения Telegram"""
    return {
        "link": f"https://t.me/Aqua_Guide_Manager?start={manager_id}"
    }


# Синглтон
telegram_service = TelegramService()