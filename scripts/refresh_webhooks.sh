#!/bin/bash
# Обновление вебхуков Google Calendar для всех менеджеров

cd /var/www/aquagid-experimental/backend-new
source venv/bin/activate

python3 -c "
import asyncio
import json
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.services.google_webhook import webhook_service

async def refresh():
    async with AsyncSessionLocal() as db:
        # Находим всех менеджеров с подключенным календарём
        result = await db.execute(
            text('SELECT manager_id, credentials FROM manager_calendar WHERE credentials IS NOT NULL')
        )
        rows = result.fetchall()
        
        for row in rows:
            manager_id = row[0]
            creds = row[1]
            try:
                await webhook_service.create_channel(manager_id, creds)
                print(f'✅ Webhook refreshed for manager {manager_id}')
            except Exception as e:
                print(f'❌ Failed for manager {manager_id}: {e}')

asyncio.run(refresh())
"

