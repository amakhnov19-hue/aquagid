"""
Сервис для управления webhook уведомлениями Google Calendar
"""

import asyncio
import uuid
import os
from datetime import datetime, timedelta
from sqlalchemy import text
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.core.database import AsyncSessionLocal

class GoogleWebhookService:
    def __init__(self):
        self.active_channels = {}
    
    async def create_channel(self, manager_id: int, credentials_data: dict):
        """Создать канал уведомлений для календаря менеджера"""
        import json
        from sqlalchemy import text
        from app.core.database import AsyncSessionLocal
        
        # Если credentials_data пришла как строка JSON, преобразуем в словарь
        if isinstance(credentials_data, str):
            credentials_data = json.loads(credentials_data)

        credentials = Credentials(
            token=credentials_data.get("token"),
            refresh_token=credentials_data.get("refresh_token"),
            token_uri=credentials_data.get("token_uri"),
            client_id=credentials_data.get("client_id"),
            client_secret=credentials_data.get("client_secret"),
            scopes=credentials_data.get("scopes")
        )
        
        service = build("calendar", "v3", credentials=credentials)
        
        # Получаем выбранный календарь менеджера
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("SELECT selected_calendar_id FROM manager_calendar WHERE manager_id = :manager_id"),
                {"manager_id": manager_id}
            )
            row = result.fetchone()
            calendar_id = row[0] if row and row[0] else "primary"
        
        channel_id = f"channel_{manager_id}_{uuid.uuid4().hex[:8]}"
        
        channel = {
            "id": channel_id,
            "type": "web_hook",
            "address": f"{os.getenv('BASE_URL', 'https://manager.experimental.24aquabooking.ru')}/api/sync/google/webhook",
            "params": {
                "ttl": "86400"
            },
            "eventTypes": [
                "created",   # Создание
                "updated",   # Изменение
                "deleted",   # Удаление ← ВОТ ЧТО НАМ НУЖНО
            ]
        }
        
        try:
            print(f"Creating webhook for calendar: {calendar_id}")
            result = service.events().watch(calendarId=calendar_id, body=channel).execute()
            print(f"Watch response: {result}")
            resource_id = result.get("resourceId")
            expiration = result.get("expiration")
            
            async with AsyncSessionLocal() as db:
                await db.execute(
                    text("""
                        UPDATE manager_calendar 
                        SET webhook_channel_id = :channel_id,
                            webhook_resource_id = :resource_id,
                            webhook_expiration = :expiration
                        WHERE manager_id = :manager_id
                    """),
                    {
                        "channel_id": channel_id,
                        "resource_id": resource_id,
                        "expiration": datetime.fromtimestamp(int(expiration)/1000) if expiration else None,
                        "manager_id": manager_id
                    }
                )
                await db.commit()
            
            return True
        except Exception as e:
            print(f"Error creating webhook channel for manager {manager_id}: {e}")
            return False

# Глобальный экземпляр
webhook_service = GoogleWebhookService()