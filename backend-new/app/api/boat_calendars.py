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
    """Сохранить выбранный календарь"""
    existing = await db.execute(
        text("SELECT id FROM manager_calendar WHERE boat_id = :bid"),
        {"bid": data["boat_id"]}
    )
    if existing.fetchone():
        raise HTTPException(status_code=400, detail="У этой лодки уже есть календарь. Сначала удалите старый.")
    
    await db.execute(
        text("""
            INSERT INTO manager_calendar (boat_id, selected_calendar_id, calendar_name, credentials, manager_id)
            VALUES (:boat_id, :calendar_id, :calendar_name, :credentials, 
                (SELECT manager_id FROM boats WHERE id = :boat_id))
        """),
        {
            "boat_id": data["boat_id"],
            "calendar_id": data["calendar_id"],
            "calendar_name": data["calendar_name"],
            "credentials": data["credentials"]
        }
    )
    await db.commit()

    from app.services.google_webhook import webhook_service
    await webhook_service.create_channel_for_boat(data["boat_id"])

    return {"success": True}
