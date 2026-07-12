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
            "address": f"{os.getenv('BASE_URL', 'https://manager.24aquabooking.ru')}/api/sync/google/webhook",
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

    async def create_channel_for_boat(self, boat_id: int):
        """Создать канал уведомлений для календаря лодки"""
        import json
        from sqlalchemy import text
        from app.core.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("SELECT credentials, selected_calendar_id FROM manager_calendar WHERE boat_id = :bid"),
                {"bid": boat_id}
            )
            row = result.fetchone()
            if not row or not row[0] or not row[1]:
                print(f"❌ No calendar for boat {boat_id}")
                return False
            
            creds_data = json.loads(row[0]) if isinstance(row[0], str) else row[0]
            calendar_id = row[1]
            
            credentials = Credentials(
                token=creds_data.get("token"),
                refresh_token=creds_data.get("refresh_token"),
                token_uri=creds_data.get("token_uri"),
                client_id=creds_data.get("client_id"),
                client_secret=creds_data.get("client_secret"),
                scopes=creds_data.get("scopes")
            )
            
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(GoogleRequest())
            
            service = build("calendar", "v3", credentials=credentials)
            
            channel_id = f"channel_boat_{boat_id}_{uuid.uuid4().hex[:8]}"
            body = {
                "id": channel_id,
                "type": "web_hook",
                "address": f"{os.getenv('BASE_URL', 'https://manager.24aquabooking.ru')}/api/sync/google/webhook",
                "params": {"ttl": "86400"}
            }
            
            watch = service.events().watch(calendarId=calendar_id, body=body).execute()
            resource_id = watch.get("resourceId")
            expiration = watch.get("expiration")
            
            await db.execute(
                text("""
                    UPDATE manager_calendar 
                    SET webhook_channel_id = :channel_id,
                        webhook_resource_id = :resource_id,
                        webhook_expiration = :expiration
                    WHERE boat_id = :boat_id
                """),
                {
                    "channel_id": channel_id,
                    "resource_id": resource_id,
                    "expiration": datetime.fromtimestamp(int(expiration)/1000) if expiration else None,
                    "boat_id": boat_id
                }
            )
            await db.commit()
            print(f"✅ Webhook created for boat {boat_id}: {resource_id}")
            return True    

# Глобальный экземпляр
webhook_service = GoogleWebhookService()