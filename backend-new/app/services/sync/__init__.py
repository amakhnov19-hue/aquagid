"""
Модуль синхронизации с внешними сервисами (Google Calendar, уведомления и т.д.)
Можно отключить через ENABLE_SYNC=false в .env
"""

from .sync_manager import SyncManager, sync_manager

__all__ = ["SyncManager", "sync_manager"]
