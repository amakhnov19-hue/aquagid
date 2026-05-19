from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Импорты API
from app.api import boats, availability, bookings, geocode, managers, messages, documents
from app.api import settings_api
from app.api import maintenance_api
from app.api import admin_invites, admin_managers, admin_boats
from app.api import admin_auth, admin_settings, admin_global_settings
from app.api import admin_diagnostics

# Синхронизация с внешними сервисами
from app.services.sync import sync_manager

from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.google_token_refresh import GoogleTokenRefreshMiddleware

app = FastAPI(
    title="AquaGid API v2.0",
    description="API для системы бронирования катеров",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5000",
        "https://experimental.24aquabooking.ru",
        "http://experimental.24aquabooking.ru",
        "https://beta.24aquabooking.ru",
        "http://beta.24aquabooking.ru",
        "https://admin.experimental.24aquabooking.ru",
        "https://admin.beta.24aquabooking.ru",
        "https://24aquabooking.ru",
        "http://24aquabooking.ru",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware
app.add_middleware(GoogleTokenRefreshMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

# Роутеры API
app.include_router(boats.router, prefix="/api")
app.include_router(availability.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(geocode.router, prefix="/api")
app.include_router(managers.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")
app.include_router(messages.router, prefix="/api/messages")
app.include_router(documents.router, prefix="/api")
from app.api import test_logs
app.include_router(test_logs.router, prefix="/api")
from app.api import terminal_pins
app.include_router(terminal_pins.router, prefix="/api")
app.include_router(maintenance_api.router, prefix="/api")

# Админские роутеры
app.include_router(admin_invites.router, prefix="/api", tags=["admin"])
app.include_router(admin_managers.router, prefix="/api")
app.include_router(admin_boats.router, prefix="/api")
app.include_router(admin_auth.router, prefix="/api")
app.include_router(admin_settings.router)
app.include_router(admin_global_settings.router)
app.include_router(admin_diagnostics.router)
app.include_router(documents.router, prefix="/api")

# Модуль синхронизации (Google Calendar, WebSocket)
if sync_manager.enabled:
    app.include_router(sync_manager.router, prefix="/api/sync")
    print("✅ Sync модуль подключен")
    
    # WebSocket подключаем отдельно
    if sync_manager.websocket_enabled:
        from app.services.sync.websocket import get_websocket_router
        app.include_router(get_websocket_router(), prefix="/api/sync/ws")
        print("✅ WebSocket маршрут: /api/sync/ws/{manager_id}")
else:
    print("⚠️ Sync модуль отключен")


@app.get("/")
async def root():
    return {
        "service": "🚤 AquaGid API v2.0",
        "status": "running",
        "environment": "development",
        "version": "2.0.0",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "boats": "/api/boats",
            "availability": "/api/availability/check"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": "2026-03-17",
        "database": "connected"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc),
            "path": request.url.path
        }
    )