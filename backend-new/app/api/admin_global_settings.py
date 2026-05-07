from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.core.database import get_db
from app.models.global_settings_model import GlobalSettings
from app.core.security import get_current_admin
from app.schemas.global_settings_schema import GlobalSettingsResponse, GlobalSettingsUpdate

router = APIRouter(prefix="/api/admin", tags=["admin_global_settings"])

@router.get("/global-settings")
async def get_global_settings(
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Получить глобальные настройки"""
    
    result = await db.execute(select(GlobalSettings).limit(1))
    settings = result.scalar_one_or_none()
    
    if not settings:
        # Возвращаем пустые настройки
        return {
            "id": None,
            "season_start": None,
            "season_end": None,
            "work_start": None,
            "work_end": None,
            "max_duration": None,
            "break_minutes": None,
            "min_duration": None,
            "default_prepayment_percent": None
        }
    
    return {
        "id": settings.id,
        "season_start": settings.season_start,
        "season_end": settings.season_end,
        "work_start": settings.work_start,
        "work_end": settings.work_end,
        "max_duration": settings.max_duration,
        "break_minutes": settings.break_minutes,
        "min_duration": settings.min_duration,
        "default_prepayment_percent": settings.default_prepayment_percent
    }

@router.put("/global-settings")
async def update_global_settings(
    data: GlobalSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Обновить глобальные настройки"""
    
    result = await db.execute(select(GlobalSettings).limit(1))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = GlobalSettings()
        db.add(settings)
    
    # Обновляем только переданные поля
    if data.season_start is not None:
        settings.season_start = data.season_start if data.season_start else None
    if data.season_end is not None:
        settings.season_end = data.season_end if data.season_end else None
    if data.work_start is not None:
        settings.work_start = data.work_start if data.work_start else None
    if data.work_end is not None:
        settings.work_end = data.work_end if data.work_end else None
    if data.max_duration is not None:
        settings.max_duration = data.max_duration
    if data.break_minutes is not None:
        settings.break_minutes = data.break_minutes
    if data.min_duration is not None:
        settings.min_duration = data.min_duration
    if data.default_prepayment_percent is not None:
        settings.default_prepayment_percent = data.default_prepayment_percent
    
    await db.commit()
    await db.refresh(settings)
    
    return {"message": "Глобальные настройки сохранены"}

@router.get("/global-settings/public")
async def get_global_settings_public(
    db: AsyncSession = Depends(get_db)
):
    """Публичные глобальные настройки (для менеджеров и клиентов, без авторизации)"""
    
    result = await db.execute(select(GlobalSettings).limit(1))
    settings = result.scalar_one_or_none()
    
    if not settings:
        return {
            "season_start": None,
            "season_end": None,
            "work_start": None,
            "work_end": None,
            "max_duration": None,
            "break_minutes": None,
            "min_duration": None,
            "default_prepayment_percent": None
        }
    
    return {
        "season_start": settings.season_start,
        "season_end": settings.season_end,
        "work_start": settings.work_start,
        "work_end": settings.work_end,
        "max_duration": settings.max_duration,
        "break_minutes": settings.break_minutes,
        "min_duration": settings.min_duration,
        "default_prepayment_percent": settings.default_prepayment_percent
    }