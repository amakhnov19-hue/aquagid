"""
Координатор синхронизации.
Управляет всеми внешними сервисами и предоставляет единый интерфейс.
"""

import os
from typing import Optional
from fastapi import APIRouter

class SyncManager:
    """Менеджер синхронизации с внешними сервисами"""
    
    def __init__(self):
        self.enabled = os.getenv("ENABLE_SYNC", "true").lower() == "true"
        self.google_enabled = os.getenv("ENABLE_GOOGLE_SYNC", "true").lower() == "true"
        self.websocket_enabled = os.getenv("ENABLE_WEBSOCKET", "true").lower() == "true"
        
        self.router = APIRouter(tags=["sync"])  # без префикса!
        self._google_service = None
        self._ws_manager = None
        
        print(f"🔄 SyncManager: enabled={self.enabled}, google={self.google_enabled}, ws={self.websocket_enabled}")
        
        if self.enabled:
            self._init_services()
    
    def _init_services(self):
        """Инициализация сервисов"""
        if self.google_enabled:
            try:
                from .google_calendar import GoogleCalendarService, get_google_router
                self._google_service = GoogleCalendarService()
                # Подключаем роуты Google Calendar
                self.router.include_router(get_google_router(), prefix="/google")
                print("✅ Google Calendar сервис инициализирован")
            except Exception as e:
                print(f"❌ Ошибка инициализации Google Calendar: {e}")
                self.google_enabled = False
        
        if self.websocket_enabled:
            try:
                from .websocket import WSConnectionManager, ws_manager, get_websocket_router
                self._ws_manager = ws_manager
                # WebSocket подключается напрямую в main.py, здесь не нужно
                # self.router.include_router(get_websocket_router(), prefix="/ws")
                print("✅ WebSocket сервис инициализирован")
            except Exception as e:
                print(f"❌ Ошибка инициализации WebSocket: {e}")
                self.websocket_enabled = False
    
    # ========== Публичный интерфейс ==========
    
    async def on_booking_created(self, booking_data: dict):
        """Вызывается при создании бронирования"""
        if not self.enabled:
            return
        
        manager_id = booking_data.get("manager_id")
        booking_id = booking_data.get("id")
        
        # Экспорт в Google Calendar
        if self.google_enabled and self._google_service:
            try:
                from app.services.sync.sync_service import sync_service
                await sync_service.export_booking(booking_id)
            except Exception as e:
                print(f"❌ Ошибка экспорта в Google: {e}")

        # Отправляем уведомление менеджеру
        try:
            from app.services.notification_service import notification_service
            await notification_service.notify("booking_new", {
                "booking_id": booking_id,
                "client_name": booking_data.get("client_name"),
                "boat_name": booking_data.get("boat_name", ""),
                "date": booking_data.get("booking_date", ""),
                "time": booking_data.get("start_time", "")[:5],
                "manager_id": manager_id,
                "client_phone": booking_data.get("client_phone", "")
            })
        except Exception as e:
            print(f"⚠️ Ошибка уведомления: {e}")
        
        # WebSocket уведомление
        if self.websocket_enabled and self._ws_manager and manager_id:
            try:
                await self._ws_manager.send_update(manager_id)
            except Exception as e:
                print(f"❌ Ошибка WebSocket уведомления: {e}")
    
    async def on_booking_deleted(self, booking_data: dict):
        """Вызывается при удалении бронирования"""
        if not self.enabled:
            return
        
        manager_id = booking_data.get("manager_id")
        google_event_id = booking_data.get("google_event_id")
        source = booking_data.get("source")
        
        # Удаление из Google Calendar
        if self.google_enabled and self._google_service and google_event_id:
            try:
                from app.services.sync.sync_service import sync_service
                await sync_service.delete_event(google_event_id, manager_id)
                print(f"🗑 Событие удалено из Google Calendar: {google_event_id}")
            except Exception as e:
                print(f"❌ Ошибка удаления из Google: {e}")
        
        # WebSocket уведомление
        if self.websocket_enabled and self._ws_manager and manager_id:
            try:
                await self._ws_manager.send_update(manager_id)
            except Exception as e:
                print(f"❌ Ошибка WebSocket уведомления: {e}")
    
    async def on_booking_updated(self, booking_data: dict):
        """Вызывается при изменении бронирования"""
        # Пока просто уведомляем
        if self.websocket_enabled and self._ws_manager:
            manager_id = booking_data.get("manager_id")
            if manager_id:
                await self._ws_manager.send_update(manager_id)


# Глобальный экземпляр
sync_manager = SyncManager()

