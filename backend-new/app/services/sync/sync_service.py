"""
SyncService — единый сервис синхронизации с Google Calendar.
Все операции импорта/экспорта проходят только через него.
"""

import asyncio
import json
import re
from datetime import datetime, timedelta
from typing import Dict, Optional, Set

from sqlalchemy import text
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.database import AsyncSessionLocal


class SyncService:
    """Централизованный сервис синхронизации"""
    
    def __init__(self):
        self._lock = asyncio.Lock()  # Блокировка для предотвращения гонки данных
        
    async def full_sync(self, manager_id: int, days: int = 7) -> Dict:
        """
        Полная двусторонняя синхронизация.
        1. Импорт новых событий из Google → БД
        2. Экспорт новых броней из БД → Google (если ещё не экспортированы)
        3. Сверка удалённых: чего нет в Google → удалить из БД
        """
        async with self._lock:  # Только одна синхронизация за раз
            result = {
                "imported": 0,
                "exported": 0,
                "deleted": 0,
                "skipped": 0,
                "errors": []
            }
            
            async with AsyncSessionLocal() as db:
                # 1. Получаем календарь менеджера
                cal = await self._get_calendar(db, manager_id)
                if not cal:
                    return {"success": False, "message": "Calendar not connected"}
                
                credentials, calendar_id = cal
                service = build("calendar", "v3", credentials=credentials)
                
                # 2. Получаем события из Google
                google_events = await self._fetch_google_events(service, calendar_id, days)
                google_event_ids = {e["id"] for e in google_events}
                
                # 3. Получаем список катеров
                boats = await self._get_manager_boats(db, manager_id)
                
                # 4. Импорт: новые события из Google → БД
                imported = await self._import_events(db, google_events, boats, manager_id)
                result["imported"] = imported
                
                # 5. Экспорт: брони без google_event_id → Google
                exported = await self._export_bookings(db, service, calendar_id, manager_id)
                result["exported"] = exported
                
                # 6. Сверка: удаляем Google-брони, которых нет в Google
                deleted = await self._remove_stale_bookings(db, google_event_ids, manager_id)
                result["deleted"] = deleted
                
                await db.commit()
                
            return {"success": True, **result}
    
    async def _get_calendar(self, db, manager_id: int) -> Optional[tuple]:
        """Получить credentials и calendar_id менеджера"""
        row = (await db.execute(
            text("SELECT credentials, selected_calendar_id FROM manager_calendar WHERE manager_id = :id"),
            {"id": manager_id}
        )).fetchone()
        
        if not row or not row[0] or not row[1]:
            return None
        
        creds_data = json.loads(row[0]) if isinstance(row[0], str) else row[0]
        
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request as GoogleRequest
        
        credentials = Credentials(
            token=creds_data.get("token"),
            refresh_token=creds_data.get("refresh_token"),
            token_uri=creds_data.get("token_uri"),
            client_id=creds_data.get("client_id"),
            client_secret=creds_data.get("client_secret"),
            scopes=creds_data.get("scopes")
        )
        
        # Принудительно обновляем токен
        if credentials.refresh_token:
            credentials.refresh(GoogleRequest())
        
        return credentials, row[1]
    
    async def _fetch_google_events(self, service, calendar_id: str, days: int) -> list:
        """Получить все события из Google Calendar за период"""
        now = datetime.utcnow()
        time_min = now.isoformat() + "Z"
        time_max = (now + timedelta(days=days)).isoformat() + "Z"
        
        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=time_min,
            timeMax=time_max,
            maxResults=250,
            singleEvents=True,
            orderBy="startTime"
        ).execute()
        
        return events_result.get("items", [])
    
    async def _get_manager_boats(self, db, manager_id: int) -> Dict[str, int]:
        """Получить словарь {название_катера: id}"""
        rows = (await db.execute(
            text("SELECT id, name FROM boats WHERE manager_id = :id"),
            {"id": manager_id}
        )).fetchall()
        return {b[1].lower(): b[0] for b in rows}
    
    async def _import_events(self, db, events: list, boats: Dict[str, int], manager_id: int) -> int:
        """Импортировать новые события из Google в БД. Возвращает количество импортированных."""
        imported = 0
        
        for event in events:
            event_id = event.get("id")
            summary = event.get("summary", "")
            start = event.get("start", {}).get("dateTime")
            end = event.get("end", {}).get("dateTime")
            
            if not start:
                continue
            
            # Проверяем, нет ли уже в активных или архиве
            existing = (await db.execute(
                text("""SELECT id FROM bookings WHERE google_event_id = :eid 
                        UNION ALL SELECT id FROM bookings_archive WHERE google_event_id = :eid"""),
                {"eid": event_id}
            )).fetchone()
            if existing:
                continue
            
            start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end.replace('Z', '+00:00')) if end else start_dt + timedelta(hours=1)
            duration_minutes = int((end_dt - start_dt).total_seconds() / 60)
            
            # Парсим название катера и клиента
            boat_name = None
            client_name = summary
            # Формат: [🔒] [🚤] НазваниеКатера - ИмяКлиента [🔒]
            # Название катера может содержать буквы, цифры, пробелы, дефисы
            match = re.search(r'(?:🔒\s+)?(?:🚤\s+)?([\w\s\-]+?)\s*-\s*(.+?)(?:\s*🔒)?$', summary)
            if match:
                boat_name = match.group(1).strip()
                client_name = match.group(2).strip()
            
            boat_id = boats.get(boat_name.lower()) if boat_name else None
            if not boat_id:
                continue
            
            # Если уже есть клиентская бронь на это время — пропускаем
            client_exists = (await db.execute(
                text("SELECT id FROM bookings WHERE boat_id = :bid AND booking_date = :d AND start_time = :t AND source = 'client'"),
                {"bid": boat_id, "d": start_dt.date(), "t": start_dt.time()}
            )).fetchone()
            if client_exists:
                continue
            
            result = await db.execute(
                text("""
                    INSERT INTO bookings (boat_id, booking_date, start_time, duration_minutes, 
                                        client_name, status, source, google_event_id)
                    VALUES (:bid, :d, :t, :dur, :name, 'active', 'google', :eid)
                    ON CONFLICT (google_event_id) DO NOTHING
                """),
                {"bid": boat_id, "d": start_dt.date(), "t": start_dt.time(),
                 "dur": duration_minutes, "name": client_name or "Google", "eid": event_id}
            )
            if result.rowcount > 0:
                imported += 1
        
        return imported
    
    async def _export_bookings(self, db, service, calendar_id: str, manager_id: int) -> int:
        """Экспортировать брони без google_event_id в Google Calendar."""
        bookings = (await db.execute(
            text("""SELECT b.id, b.booking_date, b.start_time, b.duration_minutes, 
                           b.client_name, b.client_phone, bt.name as boat_name
                    FROM bookings b JOIN boats bt ON b.boat_id = bt.id
                    WHERE bt.manager_id = :mid AND b.google_event_id IS NULL AND b.status = 'active'"""),
            {"mid": manager_id}
        )).fetchall()
        
        exported = 0
        for b in bookings:
            start_dt = datetime.combine(b[1], b[2])
            end_dt = start_dt + timedelta(minutes=b[3])
            
            event = {
                "summary": f"🔒 🚤 {b[6]} - {b[4]} 🔒" if b[4] else f"🚤 {b[6]} - Бронь",
                "description": f"Клиент: {b[4]}\nТелефон: {b[5]}\nКатер: {b[6]}\nДлительность: {b[3]} мин\nID: {b[0]}",
                "start": {"dateTime": start_dt.isoformat(), "timeZone": "Europe/Moscow"},
                "end": {"dateTime": end_dt.isoformat(), "timeZone": "Europe/Moscow"},
            }
            
            created = service.events().insert(calendarId=calendar_id, body=event).execute()
            
            await db.execute(
                text("UPDATE bookings SET google_event_id = :eid WHERE id = :id"),
                {"eid": created.get("id"), "id": b[0]}
            )
            exported += 1
        
        return exported
    
    async def _remove_stale_bookings(self, db, google_event_ids: Set[str], manager_id: int) -> int:
        """Удалить Google-брони, которых нет в Google Calendar."""
        rows = (await db.execute(
            text("""SELECT b.id, b.google_event_id FROM bookings b 
                    JOIN boats bt ON b.boat_id = bt.id
                    WHERE bt.manager_id = :mid AND b.google_event_id IS NOT NULL AND b.source = 'google'"""),
            {"mid": manager_id}
        )).fetchall()
        
        deleted = 0
        for row in rows:
            if row[1] not in google_event_ids:
                await db.execute(text("DELETE FROM bookings WHERE id = :id"), {"id": row[0]})
                deleted += 1
        
        return deleted
    
    async def export_booking(self, booking_id: int) -> Dict:
        """Экспортировать одну бронь в Google Calendar."""
        async with AsyncSessionLocal() as db:
            booking = (await db.execute(
                text("""SELECT b.id, b.booking_date, b.start_time, b.duration_minutes, 
                               b.client_name, b.client_phone, bt.name as boat_name, bt.manager_id
                        FROM bookings b JOIN boats bt ON b.boat_id = bt.id WHERE b.id = :id"""),
                {"id": booking_id}
            )).fetchone()
            
            if not booking:
                return {"success": False, "message": "Booking not found"}
            
            manager_id = booking[7]
            cal = await self._get_calendar(db, manager_id)
            if not cal:
                return {"success": False, "message": "Calendar not connected"}
            
            credentials, calendar_id = cal
            service = build("calendar", "v3", credentials=credentials)
            
            start_dt = datetime.combine(booking[1], booking[2])
            end_dt = start_dt + timedelta(minutes=booking[3])
            
            event = {
                "summary": f"🔒 🚤 {booking[6]} - {booking[4]} 🔒",
                "description": f"Клиент: {booking[4]}\nТелефон: {booking[5]}\nКатер: {booking[6]}\nДлительность: {booking[3]} мин\nID: {booking[0]}",
                "start": {"dateTime": start_dt.isoformat(), "timeZone": "Europe/Moscow"},
                "end": {"dateTime": end_dt.isoformat(), "timeZone": "Europe/Moscow"},
            }
            
            created = service.events().insert(calendarId=calendar_id, body=event).execute()
            
            await db.execute(
                text("UPDATE bookings SET google_event_id = :eid WHERE id = :id"),
                {"eid": created.get("id"), "id": booking_id}
            )
            await db.commit()
            
            return {"success": True, "event_id": created.get("id")}
    
    async def delete_event(self, google_event_id: str, manager_id: int) -> Dict:
        """Удалить событие из Google Calendar."""
        async with AsyncSessionLocal() as db:
            cal = await self._get_calendar(db, manager_id)
            if not cal:
                return {"success": False, "message": "Calendar not connected"}
            
            credentials, calendar_id = cal
            service = build("calendar", "v3", credentials=credentials)
            
            try:
                service.events().delete(calendarId=calendar_id, eventId=google_event_id).execute()
                return {"success": True}
            except Exception as e:
                return {"success": False, "error": str(e)}


# Глобальный экземпляр
sync_service = SyncService()

