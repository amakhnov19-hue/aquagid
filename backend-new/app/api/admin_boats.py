from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.boat_model import Boat as BoatModel

router = APIRouter(prefix="/admin/boats", tags=["admin"])

class BoatUpdateAdmin(BaseModel):
    name: Optional[str] = None
    pricing_method: Optional[str] = None
    price_per_hour: Optional[float] = None
    open_price: Optional[float] = None
    agent_price: Optional[float] = None
    is_active: Optional[bool] = None
    capacity: Optional[int] = None
    description_short: Optional[str] = None
    boarding_address: Optional[str] = None

@router.get("/manager/{manager_id}")
async def get_manager_boats(
    manager_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить все катера менеджера (для админа)"""
    
    result = await db.execute(
        select(BoatModel).where(BoatModel.manager_id == manager_id)
    )
    boats = result.scalars().all()
    
    return [
        {
            "id": b.id,
            "name": b.name,
            "pricing_method": b.pricing_method or "percent",
            "price_per_hour": float(b.price_per_hour) if b.price_per_hour else None,
            "open_price": float(b.open_price) if b.open_price else None,
            "agent_price": float(b.agent_price) if b.agent_price else None,
            "is_active": b.is_active,
            "capacity": b.capacity,
            "description_short": b.description_short,
            "boarding_address": b.boarding_address
        }
        for b in boats
    ]

# ========== Модерация катеров ==========

@router.get("/pending")
async def get_pending_boats(
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Получить катера, ожидающие модерации"""
    result = await db.execute(
        select(BoatModel).where(BoatModel.moderation_status == 'pending')
    )
    boats = result.scalars().all()
    
    return [
        {
            "id": b.id,
            "name": b.name,
            "manager_id": b.manager_id,
            "pricing_method": b.pricing_method,
            "price_per_hour": float(b.price_per_hour) if b.price_per_hour else None,
            "prepayment_percent": b.prepayment_percent,
            "open_price": float(b.open_price) if b.open_price else None,
            "agent_price": float(b.agent_price) if b.agent_price else None,
            "moderation_status": b.moderation_status,
            "created_at": b.created_at.isoformat() if b.created_at else None
        }
        for b in boats
    ]


class ApproveBoatRequest(BaseModel):
    approved_price_per_hour: Optional[float] = None
    approved_prepayment_percent: Optional[int] = None
    approved_open_price: Optional[float] = None
    approved_agent_price: Optional[float] = None


@router.post("/{boat_id}/approve")
async def approve_boat(
    boat_id: int,
    data: ApproveBoatRequest,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Утвердить катер и зафиксировать утверждённые значения"""
    result = await db.execute(select(BoatModel).where(BoatModel.id == boat_id))
    boat = result.scalar_one_or_none()
    
    if not boat:
        raise HTTPException(status_code=404, detail="Катер не найден")
    
    # Фиксируем утверждённые значения
    if data.approved_price_per_hour is not None:
        boat.approved_price_per_hour = data.approved_price_per_hour
        boat.price_per_hour = data.approved_price_per_hour
    
    if data.approved_prepayment_percent is not None:
        boat.approved_prepayment_percent = data.approved_prepayment_percent
        boat.prepayment_percent = data.approved_prepayment_percent
    
    if data.approved_open_price is not None:
        boat.approved_open_price = data.approved_open_price
        boat.open_price = data.approved_open_price
    
    if data.approved_agent_price is not None:
        boat.approved_agent_price = data.approved_agent_price
        boat.agent_price = data.approved_agent_price
    
    boat.moderation_status = 'approved'
    boat.activation_status = 'active'
    boat.is_active = True
    boat.last_moderation_at = datetime.now()
    boat.last_moderation_by = admin.get("sub")
    
    await db.commit()
    await db.refresh(boat)
    
    return {"message": "Катер утверждён", "boat_id": boat_id}


class RejectBoatRequest(BaseModel):
    admin_notes: str


@router.post("/{boat_id}/reject")
async def reject_boat(
    boat_id: int,
    data: RejectBoatRequest,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Отклонить катер с комментарием"""
    result = await db.execute(select(BoatModel).where(BoatModel.id == boat_id))
    boat = result.scalar_one_or_none()
    
    if not boat:
        raise HTTPException(status_code=404, detail="Катер не найден")
    
    boat.moderation_status = 'rejected'
    boat.admin_notes = data.admin_notes
    boat.last_moderation_at = datetime.now()
    boat.last_moderation_by = admin.get("sub")
    
    await db.commit()
    
    return {"message": "Катер отклонён", "boat_id": boat_id}

@router.put("/{boat_id}")
async def update_boat_admin(
    boat_id: int,
    data: BoatUpdateAdmin,
    db: AsyncSession = Depends(get_db)
):
    print(f"DEBUG update_boat_admin: data={data.model_dump()}", flush=True)
    """Обновить катер (только для админа)"""
    
    result = await db.execute(
        select(BoatModel).where(BoatModel.id == boat_id)
    )
    boat = result.scalar_one_or_none()
    
    if not boat:
        raise HTTPException(status_code=404, detail="Катер не найден")
    
    # Обновляем только переданные поля
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(boat, key, value)
    
    await db.commit()
    await db.refresh(boat)

    # Отправляем уведомление через WebSocket
    from app.services.sync.websocket import ws_manager
    if boat.manager_id:
        await ws_manager.send_update(boat.manager_id, "boats_updated")
    
    return {"message": "Катер обновлён", "id": boat.id}

@router.delete("/{boat_id}")
async def delete_boat_admin(
    boat_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Мягкое удаление катера (деактивация)"""
    
    result = await db.execute(
        select(BoatModel).where(BoatModel.id == boat_id)
    )
    boat = result.scalar_one_or_none()
    
    if not boat:
        raise HTTPException(status_code=404, detail="Катер не найден")
    
    boat.is_active = False
    boat.deleted_at = datetime.now()
    await db.commit()
    
    return {"message": "Катер деактивирован", "id": boat_id}