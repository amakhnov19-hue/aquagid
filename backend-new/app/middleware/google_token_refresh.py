from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.services.sync.google_calendar import refresh_google_token_if_expired

class GoogleTokenRefreshMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Проверяем, относится ли запрос к Google Calendar API
        if request.url.path.startswith("/api/calendar/") and request.method in ["GET", "POST", "PUT", "DELETE"]:
            # Извлекаем manager_id из пути
            path_parts = request.url.path.split("/")
            manager_id = None
            for i, part in enumerate(path_parts):
                if part.isdigit():
                    manager_id = int(part)
                    break
            
            if manager_id:
                async with AsyncSessionLocal() as db:
                    await refresh_google_token_if_expired(manager_id, db)
        
        response = await call_next(request)
        return response
