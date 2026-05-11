from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.core.database import get_db
from app.models.global_settings_model import GlobalSettings
from app.core.security import get_current_admin
from app.schemas.global_settings_schema import GlobalSettingsResponse, GlobalSettingsUpdate

router = APIRouter(prefix="/api/admin", tags=["admin_global_settings"])

def settings_to_dict(settings):
    """Преобразует модель в словарь"""
    if not settings:
        return {
            "id": None,
            "season_start": None, "season_end": None,
            "work_start": None, "work_end": None,
            "max_duration": None, "break_minutes": None,
            "min_duration": None, "default_prepayment_percent": None,
            "slot_step_minutes": None, "max_photos_per_boat": None,
            "animation_duration_ms": None
        }
    return {
        "id": settings.id,
        "season_start": settings.season_start, "season_end": settings.season_end,
        "work_start": settings.work_start, "work_end": settings.work_end,
        "max_duration": settings.max_duration, "break_minutes": settings.break_minutes,
        "min_duration": settings.min_duration, "default_prepayment_percent": settings.default_prepayment_percent,
        "slot_step_minutes": settings.slot_step_minutes, "max_photos_per_boat": settings.max_photos_per_boat,
        "animation_duration_ms": settings.animation_duration_ms
    }

@router.get("/global-settings/public")
async def get_public_settings(
    db: AsyncSession = Depends(get_db)
):
    """Публичные глобальные настройки (без авторизации)"""
    result = await db.execute(select(GlobalSettings).limit(1))
    settings = result.scalar_one_or_none()
    return settings_to_dict(settings)

@router.get("/global-settings")
async def get_global_settings(
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Получить глобальные настройки (админ)"""
    result = await db.execute(select(GlobalSettings).limit(1))
    settings = result.scalar_one_or_none()
    return settings_to_dict(settings)

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
    
    for field in ["season_start", "season_end", "work_start", "work_end",
                  "max_duration", "break_minutes", "min_duration",
                  "default_prepayment_percent", "slot_step_minutes",
                  "max_photos_per_boat", "animation_duration_ms"]:
        value = getattr(data, field, None)
        if value is not None:
            setattr(settings, field, value if value != "" else None)
    
    await db.commit()
    await db.refresh(settings)
    return {"message": "Глобальные настройки сохранены"}