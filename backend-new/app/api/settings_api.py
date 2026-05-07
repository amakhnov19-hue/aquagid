from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.manager_settings_model import ManagerSettings
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/settings", tags=["settings"])

class SettingsUpdate(BaseModel):
    season_start: Optional[str] = None
    season_end: Optional[str] = None
    work_start: Optional[str] = None
    work_end: Optional[str] = None
    max_duration: Optional[int] = None
    notify_new_bookings: Optional[bool] = None
    notify_cancellations: Optional[bool] = None
    notify_reviews: Optional[bool] = None
    notify_admin: Optional[bool] = None

@router.get("/{manager_id}")
async def get_settings(manager_id: int, db: AsyncSession = Depends(get_db)):
    """Получить настройки менеджера"""
    result = await db.execute(
        select(ManagerSettings).where(ManagerSettings.manager_id == manager_id)
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        return {
            "season_start": "2026-05-01",
            "season_end": "2026-09-30",
            "work_start": "11:00",
            "work_end": "23:30",
            "max_duration": 8,
            "notify_new_bookings": True,
            "notify_cancellations": True,
            "notify_reviews": True,
            "notify_admin": True
        }
    
    return settings

@router.put("/{manager_id}")
async def update_settings(
    manager_id: int,
    data: SettingsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Обновить настройки менеджера"""
    result = await db.execute(
        select(ManagerSettings).where(ManagerSettings.manager_id == manager_id)
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        # Создаём новую запись
        settings = ManagerSettings(manager_id=manager_id)
        db.add(settings)
    
    # Обновляем поля
    if data.season_start is not None:
        settings.season_start = data.season_start
    if data.season_end is not None:
        settings.season_end = data.season_end
    if data.work_start is not None:
        settings.work_start = data.work_start
    if data.work_end is not None:
        settings.work_end = data.work_end
    if data.max_duration is not None:
        settings.max_duration = data.max_duration
    if data.notify_new_bookings is not None:
        settings.notify_new_bookings = data.notify_new_bookings
    if data.notify_cancellations is not None:
        settings.notify_cancellations = data.notify_cancellations
    if data.notify_reviews is not None:
        settings.notify_reviews = data.notify_reviews
    if data.notify_admin is not None:
        settings.notify_admin = data.notify_admin
    
    await db.commit()
    await db.refresh(settings)
    
    return {"message": "Settings updated", "settings": settings}