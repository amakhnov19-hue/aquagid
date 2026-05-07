from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import date, time, datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.manager_settings_model import ManagerSettings
from app.core.security import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin_settings"])

class AdminManagerSettingsCreate(BaseModel):
    season_start: Optional[date] = None
    season_end: Optional[date] = None
    work_start: Optional[str] = None
    work_end: Optional[str] = None
    max_duration: Optional[int] = 4
    break_minutes: Optional[int] = 30
    min_duration: Optional[int] = 1

class AdminManagerSettingsResponse(AdminManagerSettingsCreate):
    id: int
    manager_id: int
    
    class Config:
        from_attributes = True

@router.get("/manager-settings/{manager_id}", response_model=AdminManagerSettingsResponse)
async def admin_get_manager_settings(
    manager_id: int,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Админ: получить настройки менеджера"""
    result = await db.execute(select(ManagerSettings).where(ManagerSettings.manager_id == manager_id))
    settings = result.scalar_one_or_none()
    
    if not settings:
        # Создаём дефолтные настройки
        settings = ManagerSettings(
            manager_id=manager_id,
            season_start="2026-05-01",
            season_end="2026-09-30",
            work_start="11:00",
            work_end="23:30",
            max_duration=8,
            break_minutes=30,
            min_duration=1
        )
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    # Преобразуем строки в date для API
    from datetime import date
    response_data = {
        "id": settings.id,
        "manager_id": settings.manager_id,
        "season_start": date.fromisoformat(settings.season_start) if settings.season_start else None,
        "season_end": date.fromisoformat(settings.season_end) if settings.season_end else None,
        "work_start": settings.work_start,
        "work_end": settings.work_end,
        "max_duration": settings.max_duration,
        "break_minutes": getattr(settings, 'break_minutes', 30),
        "min_duration": getattr(settings, 'min_duration', 1)
    }
    
    return response_data

@router.put("/manager-settings/{manager_id}")
async def admin_update_manager_settings(
    manager_id: int,
    settings_data: AdminManagerSettingsCreate,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Админ: обновить настройки менеджера"""
    result = await db.execute(select(ManagerSettings).where(ManagerSettings.manager_id == manager_id))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = ManagerSettings(manager_id=manager_id)
        db.add(settings)
    
    # Преобразуем date в строку для БД
    if settings_data.season_start is not None:
        settings.season_start = settings_data.season_start.isoformat() if settings_data.season_start else None
    
    if settings_data.season_end is not None:
        settings.season_end = settings_data.season_end.isoformat() if settings_data.season_end else None
    
    if settings_data.work_start is not None:
        settings.work_start = settings_data.work_start
    
    if settings_data.work_end is not None:
        settings.work_end = settings_data.work_end
    
    if settings_data.max_duration is not None:
        settings.max_duration = settings_data.max_duration
    
    if settings_data.break_minutes is not None:
        settings.break_minutes = settings_data.break_minutes
    
    if settings_data.min_duration is not None:
        settings.min_duration = settings_data.min_duration
    
    await db.commit()
    await db.refresh(settings)
    
    return {
        "message": "Настройки сохранены",
        "settings": {
            "id": settings.id,
            "manager_id": settings.manager_id,
            "season_start": settings.season_start,
            "season_end": settings.season_end,
            "work_start": settings.work_start,
            "work_end": settings.work_end,
            "max_duration": settings.max_duration,
            "break_minutes": settings.break_minutes,
            "min_duration": settings.min_duration
        }
    }