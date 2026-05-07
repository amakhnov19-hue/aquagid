from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import managers_api, boats_api, auth_api, bookings_api
from app.api import settings_api
from app.api import test_api
from app.api import booking_availability_api

app = FastAPI(
    title="AquaGid API",
    description="Бэкенд для системы бронирования катеров",
    version="0.1.0"
)

# Настройка CORS
origins = [
    "http://localhost:3000",           # для локальной разработки
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "http://experimental.24aquabooking.ru",        # клиентское приложение
    "http://manager.experimental.24aquabooking.ru", # панель менеджера
    "http://admin.experimental.24aquabooking.ru",   # админ-панель
    "https://experimental.24aquabooking.ru",        # если будет HTTPS
    "https://manager.experimental.24aquabooking.ru",
    "https://admin.experimental.24aquabooking.ru",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(managers_api.router, prefix="/api")
app.include_router(boats_api.router)
app.include_router(auth_api.router)
app.include_router(bookings_api.router)
app.include_router(settings_api.router)
app.include_router(test_api.router)
app.include_router(booking_availability_api.router)

@app.get("/")
async def root():
    return {
        "message": "🚤 AquaGid API",
        "status": "running",
        "version": "0.1.0"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}