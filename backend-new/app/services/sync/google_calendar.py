"""
Сервис для работы с Google Calendar API
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import get_current_manager

load_dotenv()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

oauth_states: Dict[str, Any] = {}


class OAuthState:
    def __init__(self, state, manager_id, code_verifier):
        self.state = state
        self.manager_id = manager_id
        self.code_verifier = code_verifier


class GoogleCalendarService:
    def __init__(self):
        self.client_id = CLIENT_ID
        self.client_secret = CLIENT_SECRET
        self.redirect_uri = REDIRECT_URI

    async def delete_event(self, google_event_id: str, manager_id: int) -> Dict:
        """Удалить событие из Google Calendar"""
        async with AsyncSessionLocal() as db:
            cal_result = await db.execute(
                text("SELECT credentials, selected_calendar_id FROM manager_calendar WHERE manager_id = :manager_id"),
                {"manager_id": manager_id}
            )
            cal_row = cal_result.fetchone()
            
            if not cal_row or not cal_row[0] or not cal_row[1]:
                return {"success": False, "message": "Calendar not connected"}
            
            creds_data = json.loads(cal_row[0])
            credentials = Credentials(
                token=creds_data.get("token"),
                refresh_token=creds_data.get("refresh_token"),
                token_uri=creds_data.get("token_uri"),
                client_id=creds_data.get("client_id"),
                client_secret=creds_data.get("client_secret"),
                scopes=creds_data.get("scopes")
            )
            
            service = build("calendar", "v3", credentials=credentials)
            
            try:
                service.events().delete(calendarId=cal_row[1], eventId=google_event_id).execute()
                print(f"🗑 Event {google_event_id} deleted from Google Calendar")
                return {"success": True}
            except Exception as e:
                print(f"❌ Failed to delete event {google_event_id}: {e}")
                return {"success": False, "error": str(e)}
    
    async def export_booking(self, booking_id: int) -> Dict:
        """Экспорт бронирования в Google Calendar"""
        async with AsyncSessionLocal() as db:
            booking_result = await db.execute(
                text("""
                    SELECT b.id, b.booking_date, b.start_time, b.duration_minutes, 
                           b.client_name, b.client_phone, bt.name as boat_name, bt.manager_id
                    FROM bookings b
                    JOIN boats bt ON b.boat_id = bt.id
                    WHERE b.id = :booking_id
                """),
                {"booking_id": booking_id}
            )
            booking = booking_result.fetchone()
            
            if not booking:
                return {"success": False, "message": "Booking not found"}
            
            manager_id = booking[7]
            
            cal_result = await db.execute(
                text("SELECT credentials, selected_calendar_id FROM manager_calendar WHERE manager_id = :manager_id"),
                {"manager_id": manager_id}
            )
            cal_row = cal_result.fetchone()
            
            if not cal_row or not cal_row[0] or not cal_row[1]:
                return {"success": False, "message": "Calendar not connected"}
            
            creds_data = json.loads(cal_row[0])
            credentials = Credentials(
                token=creds_data.get("token"),
                refresh_token=creds_data.get("refresh_token"),
                token_uri=creds_data.get("token_uri"),
                client_id=creds_data.get("client_id"),
                client_secret=creds_data.get("client_secret"),
                scopes=creds_data.get("scopes")
            )
            
            start_datetime = datetime.combine(booking[1], booking[2])
            end_datetime = start_datetime + timedelta(minutes=booking[3])
            
            service = build("calendar", "v3", credentials=credentials)
            
            event = {
                "summary": f"🔒 🚤 {booking[6]} - {booking[4]}🔒",
                "description": f"Клиент: {booking[4]}\nТелефон: {booking[5]}\nКатер: {booking[6]}\nДлительность: {booking[3]} мин\nID: {booking[0]}",
                "start": {"dateTime": start_datetime.isoformat(), "timeZone": "Europe/Moscow"},
                "end": {"dateTime": end_datetime.isoformat(), "timeZone": "Europe/Moscow"},
            }
            
            created_event = service.events().insert(calendarId=cal_row[1], body=event).execute()
            
            await db.execute(
                text("UPDATE bookings SET google_event_id = :event_id WHERE id = :booking_id"),
                {"event_id": created_event.get("id"), "booking_id": booking_id}
            )
            await db.commit()
            
            return {"success": True, "event_id": created_event.get("id")}


async def refresh_google_token_if_expired(manager_id: int, db: AsyncSession):
    """Обновляет токен Google, если он истёк"""
    result = await db.execute(
        text("SELECT access_token, refresh_token, token_expiry FROM manager_calendar WHERE manager_id = :manager_id"),
        {"manager_id": manager_id}
    )
    row = result.fetchone()
    
    if not row or not row[1]:
        return None
    
    access_token, refresh_token, token_expiry = row
    
    if token_expiry and datetime.now() < token_expiry:
        return access_token
    
    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        scopes=['https://www.googleapis.com/auth/calendar']
    )
    
    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleRequest())
        
        await db.execute(
            text("""
                UPDATE manager_calendar 
                SET access_token = :access_token, token_expiry = :token_expiry 
                WHERE manager_id = :manager_id
            """),
            {
                "access_token": creds.token,
                "token_expiry": creds.expiry,
                "manager_id": manager_id
            }
        )
        await db.commit()
        return creds.token
    
    return None


google_service = GoogleCalendarService()


def get_google_router() -> APIRouter:
    """Возвращает роутер с эндпоинтами Google Calendar"""
    router = APIRouter()

    # ========== OAuth ==========
    @router.get("/auth")
    async def google_auth(
        manager_id: int,
        db: AsyncSession = Depends(get_db)
    ):
        from google_auth_oauthlib.flow import Flow
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": CLIENT_ID,
                    "client_secret": CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [REDIRECT_URI],
                }
            },
            scopes=["https://www.googleapis.com/auth/calendar"]
        )
        flow.redirect_uri = REDIRECT_URI
        
        authorization_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent"
        )
        
        code_verifier = flow.code_verifier
        
        # Сохраняем state в БД
        await db.execute(
            text("""
                INSERT INTO oauth_state (state, manager_id, code_verifier)
                VALUES (:state, :manager_id, :code_verifier)
            """),
            {"state": state, "manager_id": manager_id, "code_verifier": code_verifier}
        )
        await db.commit()
        
        return {"auth_url": authorization_url}

    @router.get("/callback")
    async def google_callback(
        code: str,
        state: str,
        db: AsyncSession = Depends(get_db)
    ):
        print(f"🟢 CALLBACK STARTED: code={code[:10]}..., state={state}")
        print(f"🟢 /callback called, code={code[:10]}..., state={state}")
        from google_auth_oauthlib.flow import Flow
        
        # Ищем state в БД
        result = await db.execute(
            text("SELECT manager_id, code_verifier FROM oauth_state WHERE state = :state"),
            {"state": state}
        )
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=400, detail="Invalid state")
        
        manager_id = row[0]
        code_verifier = row[1]
        
        # Удаляем использованный state
        await db.execute(
            text("DELETE FROM oauth_state WHERE state = :state"),
            {"state": state}
        )
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": CLIENT_ID,
                    "client_secret": CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [REDIRECT_URI],
                }
            },
            scopes=["https://www.googleapis.com/auth/calendar"]
        )
        flow.redirect_uri = REDIRECT_URI
        
        flow.fetch_token(code=code, code_verifier=code_verifier)
        credentials = flow.credentials
        
        creds_json = credentials.to_json()
        print(f"🟢 credentials saved, length: {len(creds_json)}")
        
        # Сохраняем credentials
        await db.execute(
            text("""
                INSERT INTO manager_calendar (manager_id, credentials)
                VALUES (:manager_id, :credentials)
                ON CONFLICT (manager_id) DO UPDATE 
                SET credentials = :credentials
            """),
            {"manager_id": manager_id, "credentials": creds_json}
        )
        await db.commit()

        print(f"🔄 Creating webhook for manager {manager_id}...")

        # Обновляем токен, если нужно
        from google.auth.transport.requests import Request as GoogleRequest
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(GoogleRequest())
            creds_json = credentials.to_json()
            # Обновляем в БД
            await db.execute(
                text("UPDATE manager_calendar SET credentials = :creds WHERE manager_id = :manager_id"),
                {"creds": creds_json, "manager_id": manager_id}
            )
            await db.commit()
        
        # Создаём вебхук (после сохранения credentials)
        try:
            from app.services.google_webhook import webhook_service
            await webhook_service.create_channel(manager_id, creds_json)
            print(f"✅ Webhook created for manager {manager_id}")
        except Exception as e:
            print(f"⚠️ Webhook creation failed: {e}")

        print(f"🟢 CALLBACK SUCCESS: redirecting to settings")
        
        return RedirectResponse(url=f"{os.getenv('MANAGER_FRONTEND_URL', 'https://manager.experimental.24aquabooking.ru')}/?section=settings&calendar_connected=true")
        
    # ========== Статус ==========
    @router.get("/status/{manager_id}")
    async def calendar_status(manager_id: int, db: AsyncSession = Depends(get_db)):
        result = await db.execute(
            text("SELECT selected_calendar_id FROM manager_calendar WHERE manager_id = :manager_id"),
            {"manager_id": manager_id}
        )
        row = result.fetchone()
        return {"connected": row is not None, "calendar_id": row[0] if row else None}

    # ========== Список календарей ==========
    @router.get("/calendars/{manager_id}")
    async def list_calendars(manager_id: int, db: AsyncSession = Depends(get_db)):
        result = await db.execute(
            text("SELECT credentials FROM manager_calendar WHERE manager_id = :manager_id"),
            {"manager_id": manager_id}
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Calendar not connected")
        
        creds_data = json.loads(row[0])
        credentials = Credentials(
            token=creds_data.get("token"),
            refresh_token=creds_data.get("refresh_token"),
            token_uri=creds_data.get("token_uri"),
            client_id=creds_data.get("client_id"),
            client_secret=creds_data.get("client_secret"),
            scopes=creds_data.get("scopes")
        )
        
        service = build("calendar", "v3", credentials=credentials)
        calendar_list = service.calendarList().list().execute()
        
        return {"calendars": calendar_list.get("items", [])}

    # ========== Выбор календаря ==========
    @router.post("/select/{manager_id}")
    async def select_calendar(
        manager_id: int,
        calendar_id: str,
        db: AsyncSession = Depends(get_db)
    ):
        await db.execute(
            text("UPDATE manager_calendar SET selected_calendar_id = :calendar_id WHERE manager_id = :manager_id"),
            {"calendar_id": calendar_id, "manager_id": manager_id}
        )
        await db.commit()
        
        # Пересоздаём вебхук для выбранного календаря
        try:
            result = await db.execute(
                text("SELECT credentials FROM manager_calendar WHERE manager_id = :manager_id"),
                {"manager_id": manager_id}
            )
            row = result.fetchone()
            if row and row[0]:
                from app.services.google_webhook import webhook_service
                await webhook_service.create_channel(manager_id, row[0])
                print(f"✅ Webhook recreated for selected calendar {calendar_id}")
        except Exception as e:
            print(f"⚠️ Webhook recreation failed: {e}")
        
        return {"success": True}

    # ========== Ручные события ==========
    @router.get("/events/")
    async def get_manual_events(
        start_date: str,
        end_date: str,
        db: AsyncSession = Depends(get_db),
        current_manager = Depends(get_current_manager)
    ):
        manager_id = current_manager.get("sub")
        if not manager_id:
            raise HTTPException(status_code=401, detail="Не авторизован")
        
        from datetime import date
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
        
        result = await db.execute(
            text("""
                SELECT id, title, event_date, start_time, end_time, boat_id, boat_name, description
                FROM manual_events
                WHERE manager_id = :manager_id
                AND event_date BETWEEN :start_date AND :end_date
                ORDER BY event_date, start_time
            """),
            {"manager_id": int(manager_id), "start_date": start, "end_date": end}
        )
        events = result.fetchall()
        
        return [
            {
                "id": e[0],
                "title": e[1],
                "event_date": str(e[2]),
                "start_time": str(e[3]),
                "end_time": str(e[4]),
                "boat_id": e[5],
                "boat_name": e[6],
                "description": e[7]
            }
            for e in events
        ]

    @router.post("/events/")
    async def create_manual_event(
        event_data: dict,
        db: AsyncSession = Depends(get_db),
        current_manager = Depends(get_current_manager)
    ):
        try:
            from datetime import date, time, datetime
            
            manager_id = current_manager.get("sub")
            if not manager_id:
                raise HTTPException(status_code=401, detail="Не авторизован")
            
            # Преобразуем строки в объекты
            event_date_str = event_data.get("event_date")
            event_date = date.fromisoformat(event_date_str) if event_date_str else None
            
            start_time_str = event_data.get("start_time")
            start_time = time.fromisoformat(start_time_str) if start_time_str else None
            
            end_time_str = event_data.get("end_time")
            end_time = time.fromisoformat(end_time_str) if end_time_str else None
            
            # Считаем длительность в минутах
            start_dt = datetime.combine(event_date, start_time)
            end_dt = datetime.combine(event_date, end_time)
            duration_minutes = int((end_dt - start_dt).total_seconds() / 60)
            
            boat_id = event_data.get("boat_id")
            boat_name = event_data.get("boat_name")
            client_name = event_data.get("title")
            description = event_data.get("description")
            
            # 1. Вставляем в manual_events
            await db.execute(
                text("""
                    INSERT INTO manual_events (manager_id, title, event_date, start_time, end_time, boat_id, boat_name, description)
                    VALUES (:manager_id, :title, :event_date, :start_time, :end_time, :boat_id, :boat_name, :description)
                """),
                {
                    "manager_id": int(manager_id),
                    "title": client_name,
                    "event_date": event_date,
                    "start_time": start_time,
                    "end_time": end_time,
                    "boat_id": boat_id,
                    "boat_name": boat_name,
                    "description": description
                }
            )
            
            # 2. Создаём бронирование в bookings (чтобы влиять на доступность)
            await db.execute(
                text("""
                    INSERT INTO bookings (boat_id, booking_date, start_time, duration_minutes, client_name, status, source, description)
                    VALUES (:boat_id, :booking_date, :start_time, :duration_minutes, :client_name, 'active', 'manual', :description)
                """),
                {
                    "boat_id": boat_id,
                    "booking_date": event_date,
                    "start_time": start_time,
                    "duration_minutes": duration_minutes,
                    "client_name": client_name,
                    "description": description
                }
            )
            
            await db.commit()
            
            # 3. Экспортируем в Google Calendar (если подключен)
            # Получаем ID последней вставленной брони
            result = await db.execute(text("SELECT currval('bookings_id_seq')"))
            booking_id = result.scalar()
            
            if booking_id:
                from app.services.sync.google_calendar import google_service
                await google_service.export_booking(booking_id)
            
            return {"success": True, "message": "Событие создано"}
        except Exception as e:
            print(f"❌ ERROR creating manual event: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    @router.delete("/events/{event_id}")
    async def delete_manual_event(
        event_id: int,
        db: AsyncSession = Depends(get_db),
        current_manager = Depends(get_current_manager)
    ):
        manager_id = current_manager.get("sub")
        if not manager_id:
            raise HTTPException(status_code=401, detail="Не авторизован")
        
        # Получаем данные события перед удалением
        result = await db.execute(
            text("SELECT boat_id, event_date, start_time FROM manual_events WHERE id = :event_id AND manager_id = :manager_id"),
            {"event_id": event_id, "manager_id": int(manager_id)}
        )
        event = result.fetchone()
        
        if event:
            boat_id, event_date, start_time = event
            
            # Удаляем соответствующее бронирование из bookings
            await db.execute(
                text("DELETE FROM bookings WHERE boat_id = :boat_id AND booking_date = :event_date AND start_time = :start_time AND source = 'manual'"),
                {"boat_id": boat_id, "event_date": event_date, "start_time": start_time}
            )
        
        # Удаляем ручное событие
        await db.execute(
            text("DELETE FROM manual_events WHERE id = :event_id AND manager_id = :manager_id"),
            {"event_id": event_id, "manager_id": int(manager_id)}
        )
        
        await db.commit()
        return {"success": True, "message": "Событие удалено"}

    # ========== Бронирования для календаря ==========
    @router.get("/bookings/{manager_id}")
    async def get_calendar_bookings(
        manager_id: int,
        days: int = 90,
        db: AsyncSession = Depends(get_db)
    ):
        end_date = datetime.now().date() + timedelta(days=days)
        
        result = await db.execute(
            text("""
                SELECT b.id, b.booking_date, b.start_time, b.duration_minutes,
                       b.client_name, b.client_phone, b.status, b.source,
                       bt.id as boat_id, bt.name as boat_name
                FROM bookings b
                JOIN boats bt ON b.boat_id = bt.id
                WHERE bt.manager_id = :manager_id
                  AND b.booking_date >= CURRENT_DATE
                  AND b.booking_date <= :end_date
                  AND b.status = 'active'
                ORDER BY b.booking_date, b.start_time
            """),
            {"manager_id": manager_id, "end_date": end_date}
        )
        
        bookings = []
        for row in result.fetchall():
            bookings.append({
                "id": row[0],
                "date": str(row[1]),
                "start_time": str(row[2]),
                "duration_minutes": row[3],
                "client_name": row[4],
                "client_phone": row[5],
                "status": row[6],
                "source": row[7],
                "boat_id": row[8],
                "boat_name": row[9]
            })
        
        return {"success": True, "bookings": bookings}

    async def do_import_from_calendar(manager_id: int, days: int = 7):
        """Внутренняя функция импорта из Google Calendar"""
        import re
        from app.api.availability import check_availability_internal
        
        async with AsyncSessionLocal() as db:
            cal_result = await db.execute(
                text("SELECT credentials, selected_calendar_id FROM manager_calendar WHERE manager_id = :manager_id"),
                {"manager_id": manager_id}
            )
            cal_row = cal_result.fetchone()
            
            if not cal_row or not cal_row[0] or not cal_row[1]:
                print(f"❌ Calendar not connected for manager {manager_id}")
                return {"success": False, "imported": 0}
            
            creds_data = json.loads(cal_row[0])
            credentials = Credentials(
                token=creds_data.get("token"),
                refresh_token=creds_data.get("refresh_token"),
                token_uri=creds_data.get("token_uri"),
                client_id=creds_data.get("client_id"),
                client_secret=creds_data.get("client_secret"),
                scopes=creds_data.get("scopes")
            )
            
            service = build("calendar", "v3", credentials=credentials)
            
            now = datetime.utcnow()
            time_min = now.isoformat() + "Z"
            time_max = (now + timedelta(days=days)).isoformat() + "Z"
            
            events_result = service.events().list(
                calendarId=cal_row[1],
                timeMin=time_min,
                timeMax=time_max,
                maxResults=100,
                singleEvents=True,
                orderBy="startTime"
            ).execute()
            
            events = events_result.get("items", [])
            
            boats_result = await db.execute(
                text("SELECT id, name FROM boats WHERE manager_id = :manager_id"),
                {"manager_id": manager_id}
            )
            boats = {boat[1].lower(): boat[0] for boat in boats_result.fetchall()}
            
            imported = 0
            deleted_count = 0
            
            for event in events:
                event_id = event.get("id")
                summary = event.get("summary", "")
                start = event.get("start", {}).get("dateTime")
                end = event.get("end", {}).get("dateTime")
                
                if not start:
                    continue
                
                # Проверяем и активные, и архив
                existing = await db.execute(
                    text("SELECT id FROM bookings WHERE google_event_id = :event_id UNION ALL SELECT id FROM bookings_archive WHERE google_event_id = :event_id"),
                    {"event_id": event_id}
                )
                if existing.fetchone():
                    print(f"  ⏭️ Skipped: event already exists (active or archived)")
                    continue
                
                start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(end.replace('Z', '+00:00')) if end else start_dt + timedelta(hours=1)
                duration_minutes = int((end_dt - start_dt).total_seconds() / 60)
                
                boat_name = None
                client_name = summary
                
                match = re.search(r'(?:🔒\s+)?(?:🚤\s+)?(.+?)\s*-\s*(.+?)(?:\s*🔒)?$', summary)
                if match:
                    boat_name = match.group(1).strip()
                    client_name = match.group(2).strip()
                
                boat_id = boats.get(boat_name.lower()) if boat_name else None
                
                if not boat_id:
                    continue

                # Проверяем, не создана ли уже клиентская бронь на это время
                existing_client = await db.execute(
                    text("SELECT id FROM bookings WHERE boat_id = :boat_id AND booking_date = :date AND start_time = :time AND source = 'client'"),
                    {"boat_id": boat_id, "date": start_dt.date(), "time": start_dt.time()}
                )
                if existing_client.fetchone():
                    print(f"  ⏭️ Skipped: client booking already exists")
                    continue

                print(f"  📅 Importing: {summary} | Boat: {boat_name} | Time: {start_dt}")
                
                result = await db.execute(
                    text("""
                        INSERT INTO bookings (boat_id, booking_date, start_time, duration_minutes, 
                                            client_name, status, source, google_event_id)
                        VALUES (:boat_id, :date, :start_time, :duration, :client_name, 'active', 'google', :event_id)
                        ON CONFLICT (google_event_id) DO NOTHING
                    """),
                    {
                        "boat_id": boat_id,
                        "date": start_dt.date(),
                        "start_time": start_dt.time(),
                        "duration": duration_minutes,
                        "client_name": client_name or "Из Google Calendar",
                        "event_id": event_id
                    }
                )
                if result.rowcount > 0:
                    imported += 1
                    print(f"  ✅ Imported: {summary}")
                else:
                    print(f"  ⏭️ Skipped (already exists): {summary}")
            
            # === Сверка удалённых Google-броней ===
            google_event_ids = {event.get("id") for event in events}
            existing_google = await db.execute(
                text("""
                    SELECT b.id, b.google_event_id 
                    FROM bookings b 
                    JOIN boats bt ON b.boat_id = bt.id 
                    WHERE bt.manager_id = :manager_id 
                    AND b.google_event_id IS NOT NULL 
                    AND b.source = 'google'
                """),
                {"manager_id": manager_id}
            )
            
            for row in existing_google.fetchall():
                if row[1] not in google_event_ids:
                    await db.execute(text("INSERT INTO bookings_archive SELECT * FROM bookings WHERE id = :id"), {"id": row[0]})
                    await db.execute(text("UPDATE bookings_archive SET status = 'cancelled_google' WHERE id = :id"), {"id": row[0]})
                    await db.execute(text("DELETE FROM bookings WHERE id = :id"), {"id": row[0]})
                    print(f"  🗑 Archived Google booking {row[0]}")
                    deleted_count += 1
            
            await db.commit()
            print(f"✅ Imported {imported} events, deleted {deleted_count} for manager {manager_id}")
            return {"success": True, "imported": imported, "deleted": deleted_count}

    # ========== Импорт из Google Calendar ==========
    @router.post("/import/{manager_id}")
    async def import_from_calendar(manager_id: int, days: int = 30):
        result = await do_import_from_calendar(manager_id, days)
        
        # Отправляем WebSocket уведомление
        from app.services.sync.websocket import ws_manager
        await ws_manager.send_update(manager_id)
        
        return result

    # ========== Webhook ==========
    @router.post("/webhook")
    async def google_webhook(request: Request):
        headers = dict(request.headers)
        
        import logging
        logging.warning(f"🔔 ALL HEADERS: {headers}")
        
        resource_id = headers.get('x-goog-resource-id')
        resource_state = headers.get('x-goog-resource-state')
        channel_id_header = headers.get('x-goog-channel-id')
        
        logging.warning(f"Webhook received: resource_id={resource_id}, state={resource_state}")
        
        # Подтверждение синхронизации (обязательно для активации вебхука)
        if resource_state == 'sync':
            logging.warning("✅ Webhook sync received, confirming...")
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    text("SELECT webhook_channel_id FROM manager_calendar WHERE webhook_resource_id = :resource_id"),
                    {"resource_id": resource_id}
                )
                row = result.fetchone()
                channel_id = row[0] if row and row[0] else resource_id
                logging.warning(f"✅ Webhook sync confirmed, channel_id={channel_id}")
            
            from fastapi.responses import JSONResponse
            return JSONResponse(
                content={"success": True},
                headers={"X-Goog-Channel-Token": channel_id}
            )
        
        if not resource_id:
            return {"success": True}
        
        async with AsyncSessionLocal() as db:
            logging.warning(f"🔍 Searching for manager with resource_id={resource_id}")
            result = await db.execute(
                text("SELECT manager_id FROM manager_calendar WHERE webhook_resource_id = :resource_id"),
                {"resource_id": resource_id}
            )
            row = result.fetchone()
            logging.warning(f"🔍 Found row: {row}")
            
            if not row:
                return {"success": True}
            
            manager_id = row[0]
            
            # Обработка удаления события
            if resource_state == 'not_exists' and channel_id_header:
                logging.warning(f"🗑 Webhook: event deleted, channel_id={channel_id_header}")
                # Находим бронь по google_event_id
                event_result = await db.execute(
                    text("SELECT id, source, boat_id, booking_date, start_time, duration_minutes, client_name, google_event_id FROM bookings WHERE google_event_id = :event_id"),
                    {"event_id": channel_id_header}
                )
                booking = event_result.fetchone()
                
                if booking:
                    booking_id, source, boat_id, b_date, b_time, b_dur, b_client, b_gevent_id = booking
                    
                    if source == 'client':
                        # Элегантное решение: восстанавливаем событие в Google Calendar
                        logging.warning(f"🔄 Восстановление клиентской брони в Google Calendar...")
                        
                        # Находим название катера
                        boat_result = await db.execute(
                            text("SELECT name FROM boats WHERE id = :boat_id"),
                            {"boat_id": boat_id}
                        )
                        boat_name = boat_result.scalar()
                        
                        # Получаем сервис Google
                        from app.services.sync.google_calendar import google_service
                        await google_service.export_booking(booking_id)
                        
                        # Отправляем уведомление
                        from app.services.sync.websocket import ws_manager
                        await ws_manager.send_update(manager_id)
                        
                    else:
                        # Удаляем Google-бронь
                        logging.warning(f"🗑 Deleting Google booking {booking_id}")
                        # Переносим в архив
                        await db.execute(text("INSERT INTO bookings_archive SELECT * FROM bookings WHERE id = :id"), {"id": booking_id})
                        await db.execute(text("UPDATE bookings_archive SET status = 'cancelled_google' WHERE id = :id"), {"id": booking_id})
                        await db.execute(text("DELETE FROM bookings WHERE id = :id"), {"id": booking_id})
                        await db.commit()
                        from app.services.sync.websocket import ws_manager
                        await ws_manager.send_update(manager_id)
                return {"success": True}

            # Обработка изменения/создания
            if resource_state == 'exists':
                try:
                    logging.warning(f"🔄 Webhook: starting import for manager {manager_id}")
                    await do_import_from_calendar(manager_id, days=7)
                    logging.warning(f"✅ Webhook: import completed for manager {manager_id}")
                    from app.services.sync.websocket import ws_manager
                    await ws_manager.send_update(manager_id)
                except Exception as e:
                    logging.error(f"❌ Webhook: import failed for manager {manager_id}: {e}")
                    import traceback
                    traceback.print_exc()
        
        return {"success": True}

    # ========== Отключение календаря ==========
    @router.delete("/{manager_id}")
    async def disconnect_calendar(
        manager_id: int,
        db: AsyncSession = Depends(get_db),
    ):
        await db.execute(
            text("DELETE FROM manager_calendar WHERE manager_id = :manager_id"),
            {"manager_id": manager_id}
        )
        await db.commit()
        return {"success": True, "message": "Calendar disconnected"}

    return router