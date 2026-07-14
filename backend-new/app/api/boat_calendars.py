"""
API для подключения Google Calendar к лодкам
Работает с таблицей manager_calendar
"""

import os
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

from app.core.database import get_db
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build

load_dotenv()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = "https://manager.24aquabooking.ru/api/boat-calendars/callback"

router = APIRouter(prefix="/boat-calendars", tags=["boat_calendars"])


@router.get("/auth")
async def boat_calendar_auth(
    boat_id: int,
    manager_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Начать OAuth для подключения календаря к лодке"""
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
    
    await db.execute(
        text("""
            INSERT INTO oauth_state (state, manager_id, code_verifier, boat_id)
            VALUES (:state, :manager_id, :code_verifier, :boat_id)
        """),
        {
            "state": state,
            "manager_id": manager_id,
            "code_verifier": flow.code_verifier,
            "boat_id": boat_id
        }
    )
    await db.commit()
    
    print(f"🔍 BOAT CALENDAR AUTH: redirect_uri={REDIRECT_URI}", flush=True)
    return {"auth_url": authorization_url}


@router.get("/calendars/{boat_id}")
async def list_boat_calendars(
    boat_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить список подключенных календарей лодки"""
    result = await db.execute(
        text("SELECT id, selected_calendar_id, calendar_name FROM manager_calendar WHERE boat_id = :bid AND selected_calendar_id IS NOT NULL"),
        {"bid": boat_id}
    )
    calendars = [
        {"id": row[0], "calendar_id": row[1], "calendar_name": row[2] or row[1]}
        for row in result.fetchall()
    ]
    return {"calendars": calendars}


@router.post("/disconnect/{calendar_id}")
async def disconnect_boat_calendar(
    calendar_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Отключить календарь от лодки"""
    await db.execute(
        text("UPDATE manager_calendar SET selected_calendar_id = NULL, boat_id = NULL WHERE id = :cid"),
        {"cid": calendar_id}
    )
    await db.commit()
    return {"success": True}


@router.get("/callback")
async def boat_calendar_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db)
):
    """Обработка callback от Google OAuth"""
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build
    
    result = await db.execute(
        text("SELECT manager_id, code_verifier, boat_id FROM oauth_state WHERE state = :state"),
        {"state": state}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=400, detail="Invalid state")
    
    manager_id, code_verifier, boat_id = row
    
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
    flow.code_verifier = code_verifier
    
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    service = build("calendar", "v3", credentials=credentials)
    calendars_result = service.calendarList().list().execute()
    calendars = calendars_result.get("items", [])
    
    options = ""
    for cal in calendars:
        options += f'<option value="{cal["id"]}">{cal.get("summary", cal["id"])}</option>'
    
    html = f"""
    <html><head><meta charset="utf-8"><title>Выбор календаря</title>
    <style>body{{font-family:sans-serif;max-width:500px;margin:50px auto;padding:20px}}
    select,button{{padding:10px;font-size:16px;margin:10px 0;width:100%}}</style></head>
    <body>
    <h2>Выберите календарь для лодки</h2>
    <form id="form" onsubmit="saveCalendar(event)">
    <select id="calendar">{options}</select>
    <button type="submit">Сохранить</button>
    </form>
    <script>
    async function saveCalendar(e){{
        e.preventDefault();
        const calId = document.getElementById('calendar').value;
        const calName = document.getElementById('calendar').selectedOptions[0].text;
        const resp = await fetch('/api/boat-calendars/save', {{
            method: 'POST',
            headers: {{'Content-Type':'application/json'}},
            body: JSON.stringify({{
                boat_id: {boat_id},
                calendar_id: calId,
                calendar_name: calName,
                credentials: {json.dumps(credentials.to_json())}
            }})
        }});
        if(resp.ok) {{
            document.body.innerHTML = '<h2>✅ Календарь подключен!</h2><p>Можете закрыть окно.</p>';
        }} else {{
            alert('Ошибка сохранения');
        }}
    }}
    </script></body></html>
    """
    
    return HTMLResponse(content=html)


@router.post("/save")
async def save_boat_calendar(
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Сохранить или обновить календарь лодки"""
    boat_id = data["boat_id"]
    calendar_id = data["calendar_id"]
    credentials_json = data["credentials"]
    calendar_name_from_client = data.get("calendar_name", "")
    
    # Получаем актуальное имя календаря из Google API
    real_calendar_name = calendar_name_from_client
    try:
        creds_data = json.loads(credentials_json)
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
        calendar_info = service.calendars().get(calendarId=calendar_id).execute()
        real_calendar_name = calendar_info.get("summary", calendar_name_from_client)
    except Exception as e:
        print(f"⚠️ Не удалось получить имя календаря из Google: {e}")
    
    # Получаем manager_id лодки
    boat_result = await db.execute(
        text("SELECT manager_id FROM boats WHERE id = :bid"),
        {"bid": boat_id}
    )
    boat_row = boat_result.fetchone()
    if not boat_row:
        raise HTTPException(status_code=404, detail="Лодка не найдена")
    manager_id = boat_row[0]
    
    # Проверяем, есть ли уже запись для этой лодки
    existing = await db.execute(
        text("SELECT id FROM manager_calendar WHERE boat_id = :bid"),
        {"bid": boat_id}
    )
    
    if existing.fetchone():
        # Обновляем существующую запись
        await db.execute(
            text("""
                UPDATE manager_calendar 
                SET selected_calendar_id = :calendar_id,
                    calendar_name = :calendar_name,
                    credentials = :credentials
                WHERE boat_id = :boat_id
            """),
            {
                "boat_id": boat_id,
                "calendar_id": calendar_id,
                "calendar_name": real_calendar_name,
                "credentials": credentials_json
            }
        )
        print(f"🔄 Календарь обновлён: лодка {boat_id}, имя '{real_calendar_name}'")
    else:
        # Создаём новую запись
        await db.execute(
            text("""
                INSERT INTO manager_calendar (boat_id, selected_calendar_id, calendar_name, credentials, manager_id)
                VALUES (:boat_id, :calendar_id, :calendar_name, :credentials, :manager_id)
            """),
            {
                "boat_id": boat_id,
                "calendar_id": calendar_id,
                "calendar_name": real_calendar_name,
                "credentials": credentials_json,
                "manager_id": manager_id
            }
        )
        print(f"✅ Календарь создан: лодка {boat_id}, имя '{real_calendar_name}'")
    
    await db.commit()

    # Пересоздаём вебхук
    from app.services.google_webhook import webhook_service
    await webhook_service.create_channel_for_boat(boat_id)

    return {"success": True, "calendar_name": real_calendar_name}
