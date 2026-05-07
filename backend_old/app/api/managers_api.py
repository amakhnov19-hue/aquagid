from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database.database import get_db
from app.models.manager_model import Manager

router = APIRouter(prefix="/managers", tags=["menegers"])

@router.get("/")
async def get_managers(db: AsyncSession = Depends(get_db)):
    """Получить список всех менеджеров"""
    result = await db.execute(select(Manager))
    managers = result.scalars().all()
    return managers

@router.get("/{manager_id}")
async def get_manager(manager_id: int, db: AsyncSession = Depends(get_db)):
    """Получить менеджера по ID"""
    result = await db.execute(select(Manager).where(Manager.id == manager_id))
    manager = result.scalar_one_or_none()
    
    if not manager:
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    
    return manager

from pydantic import BaseModel
from typing import Optional

class ManagerUpdate(BaseModel):
    company_name: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    telegram: Optional[str] = None
    vk: Optional[str] = None

@router.put("/{manager_id}")
async def update_manager(
    manager_id: int,
    data: ManagerUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Обновить данные менеджера"""
    result = await db.execute(
        select(Manager).where(Manager.id == manager_id)
    )
    manager = result.scalar_one_or_none()
    
    if not manager:
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    
    # Обновляем поля
    if data.company_name is not None:
        manager.company_name = data.company_name
    if data.full_name is not None:
        manager.full_name = data.full_name
    if data.phone is not None:
        manager.phone = data.phone
    if data.email is not None:
        manager.email = data.email
    if data.telegram is not None:
        manager.telegram_data = {"username": data.telegram}
    
    await db.commit()
    await db.refresh(manager)
    
    return {"message": "Данные менеджера обновлены", "manager": manager}