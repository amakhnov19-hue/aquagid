"""
Сервис уведомлений AquaGid.
Единая точка отправки уведомлений для менеджеров и клиентов.
Каналы: Web (внутренние), Telegram, Max (VK) — опционально.
"""

import requests
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import text
from app.core.database import AsyncSessionLocal


class NotificationService:
    """Централизованный сервис уведомлений"""
    
    # Типы событий
    EVENT_BOOKING_NEW = "booking_new"
    EVENT_BOOKING_CANCEL_REQUEST = "booking_cancel_request"
    EVENT_BOOKING_CANCELLED = "booking_cancelled"
    EVENT_ADMIN_MESSAGE = "admin_message"
    
    # Каналы
    CHANNEL_WEB = "web"
    CHANNEL_TELEGRAM = "telegram"
    CHANNEL_MAX = "max"
    
    def __init__(self):
        self.telegram_bot_token = None  # Токен бота Telegram
        self.max_bot_token = None       # Токен бота Max
    
    # ============================================================
    # ПУБЛИЧНЫЙ ИНТЕРФЕЙС
    # ============================================================
    
    async def notify(self, event_type: str, data: Dict[str, Any]):
        """
        Главный метод отправки уведомления.
        Автоматически определяет: кому, какой текст, по каким каналам.
        
        data должен содержать:
        - booking_id: int
        - client_name: str
        - boat_name: str
        - date: str (YYYY-MM-DD)
        - time: str (HH:MM)
        - manager_id: int (для уведомлений менеджеру)
        - client_phone: str (для уведомлений клиенту)
        """
        
        if event_type == self.EVENT_BOOKING_NEW:
            await self._notify_manager(event_type, data, 
                title="🚤 Новая бронь",
                body=f"{data.get('client_name')}, {data.get('boat_name')}, {data.get('date')} {data.get('time')}"
            )
        
        elif event_type == self.EVENT_BOOKING_CANCEL_REQUEST:
            await self._notify_client(event_type, data,
                title="📋 Запрос отмены",
                body=f"Менеджер запросил отмену брони на {data.get('date')} в {data.get('time')}. Подтвердите в личном кабинете."
            )
        
        elif event_type == self.EVENT_BOOKING_CANCELLED:
            await self._notify_manager(event_type, data,
                title="❌ Бронь отменена",
                body=f"{data.get('client_name')}, {data.get('boat_name')}, {data.get('date')} {data.get('time')}"
            )
    
    # ============================================================
    # ОТПРАВКА МЕНЕДЖЕРУ
    # ============================================================
    
    async def _notify_manager(self, event_type: str, data: dict, title: str, body: str):
        """Отправить уведомление менеджеру по всем разрешённым каналам"""
        manager_id = data.get("manager_id")
        if not manager_id:
            return
        
        settings = await self._get_manager_settings(manager_id) or {}
        
        # 1. Web (всегда)
        await self._send_web(
            receiver_type="manager",
            receiver_id=str(manager_id),
            event_type=event_type,
            title=title,
            body=body,
            booking_id=data.get("booking_id")
        )
        
        # 2. Telegram (если подключен)
        if settings.get("telegram_chat_id"):
            await self._send_telegram(
                chat_id=settings["telegram_chat_id"],
                message=f"{title}\n{body}"
            )
        
        # 3. Max (если подключен) — позже
        # if settings.get("max_user_id"):
        #     await self._send_max(user_id=settings["max_user_id"], message=f"{title}\n{body}")
    
    # ============================================================
    # ОТПРАВКА КЛИЕНТУ
    # ============================================================
    
    async def _notify_client(self, event_type: str, data: dict, title: str, body: str):
        """Отправить уведомление клиенту"""
        client_phone = data.get("client_phone")
        if not client_phone:
            return
        
        # Только Web для клиента
        await self._send_web(
            receiver_type="client",
            receiver_id=client_phone,
            event_type=event_type,
            title=title,
            body=body,
            booking_id=data.get("booking_id")
        )
    
    # ============================================================
    # КАНАЛЫ ДОСТАВКИ
    # ============================================================
    
    async def _send_web(self, receiver_type: str, receiver_id: str, event_type: str, 
                        title: str, body: str, booking_id: Optional[int] = None):
        """Сохранить уведомление в БД (Web-канал)"""
        print(f"🔔 _send_web START: {receiver_type}={receiver_id}, type={event_type}")
        try:
            async with AsyncSessionLocal() as db:
                print(f"🔔 INSERT INTO messages: {title}")
                await db.execute(
                    text("""
                        INSERT INTO messages (sender_type, sender_id, receiver_type, receiver_id, type, title, body, related_booking_id)
                        VALUES ('system', '0', :receiver_type, :receiver_id, :type, :title, :body, :booking_id)
                    """),
                    {
                        "receiver_type": receiver_type,
                        "receiver_id": receiver_id,
                        "type": event_type,
                        "title": title,
                        "body": body,
                        "booking_id": booking_id
                    }
                )
                await db.commit()
                print(f"🔔 _send_web DONE")
        except Exception as e:
            print(f"❌ Ошибка сохранения уведомления: {e}")
            import traceback
            traceback.print_exc()
    
    async def _send_telegram(self, chat_id: str, message: str):
        """Отправить уведомление в Telegram"""
        if not self.telegram_bot_token:
            print("⚠️ Telegram бот не настроен")
            return
        
        try:
            url = f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage"
            response = requests.post(url, json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML"
            }, timeout=5)
            
            if response.status_code == 200:
                print(f"📱 Telegram уведомление отправлено: {chat_id}")
            else:
                print(f"❌ Ошибка Telegram: {response.text}")
        except Exception as e:
            print(f"❌ Ошибка отправки в Telegram: {e}")
    
    # ============================================================
    # ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    # ============================================================
    
    async def _get_manager_settings(self, manager_id: int) -> Optional[dict]:
        """Получить настройки уведомлений менеджера"""
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    text("SELECT telegram_chat_id, max_user_id FROM manager_notifications WHERE manager_id = :id"),
                    {"id": manager_id}
                )
                row = result.fetchone()
                if row:
                    return {"telegram_chat_id": row[0], "max_user_id": row[1]}
        except Exception as e:
            print(f"❌ Ошибка загрузки настроек: {e}")
        return {}


# Глобальный экземпляр
notification_service = NotificationService()

