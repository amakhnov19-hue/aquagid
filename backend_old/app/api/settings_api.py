from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any

from app.database.database import get_db
from app.models.settings_model import Settings

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("/")
async def get_all_settings(db: AsyncSession = Depends(get_db)):
    """Получить все настройки"""
    result = await db.execute(select(Settings))
    settings_rows = result.scalars().all()
    
    # Преобразуем в словарь
    settings_dict = {row.key: row.value for row in settings_rows}
    
    # НИКАКИХ ЗНАЧЕНИЙ ПО УМОЛЧАНИЮ! Возвращаем только то что есть в базе
    return settings_dict

@router.get("/{key}")
async def get_setting(key: str, db: AsyncSession = Depends(get_db)):
    """Получить конкретную настройку"""
    result = await db.execute(
        select(Settings).where(Settings.key == key)
    )
    setting = result.scalar_one_or_none()
    
    if not setting:
        # Возвращаем значение по умолчанию
        if key in DEFAULT_SETTINGS:
            return {key: DEFAULT_SETTINGS[key]}
        raise HTTPException(status_code=404, detail="Настройка не найдена")
    
    return {setting.key: setting.value}

@router.post("/{key}")
async def save_setting(
    key: str, 
    value: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """Сохранить настройку"""
    result = await db.execute(
        select(Settings).where(Settings.key == key)
    )
    setting = result.scalar_one_or_none()
    
    if setting:
        # Обновляем существующую
        setting.value = value
    else:
        # Создаем новую
        setting = Settings(key=key, value=value)
        db.add(setting)
    
    await db.commit()
    await db.refresh(setting)
    
    return {"message": f"Настройка {key} сохранена", "value": value}

@router.post("/")
async def save_all_settings(
    settings: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """Сохранить все настройки"""
    print(f"📥 Получены настройки: {settings}")
    
    for key, value in settings.items():
        # Проверяем что value не пустой
        if value is None:
            print(f"⚠️ Пропускаем {key}: значение None")
            continue
            
        result = await db.execute(
            select(Settings).where(Settings.key == key)
        )
        setting = result.scalar_one_or_none()
        
        if setting:
            print(f"🔄 Обновляем {key}: {value}")
            setting.value = value
        else:
            print(f"➕ Создаем {key}: {value}")
            setting = Settings(key=key, value=value)
            db.add(setting)
    
    await db.commit()
    print("✅ Все настройки сохранены")
    
    # Возвращаем обновленные настройки
    return await get_all_settings(db)
