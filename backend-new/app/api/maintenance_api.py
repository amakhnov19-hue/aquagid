from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from pydantic import BaseModel
from typing import List  # ← добавить эту строку

from app.core.database import get_db
from app.models.boat_maintenance_model import BoatMaintenance
from app.models.boat_model import Boat

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

class MaintenanceCreate(BaseModel):
    boat_id: int
    start_time: datetime
    end_time: datetime
    reason: str = None

class MaintenanceResponse(BaseModel):
    id: int
    boat_id: int
    start_time: datetime
    end_time: datetime
    reason: str = None
    
    class Config:
        from_attributes = True

@router.get("/boat/{boat_id}", response_model=List[MaintenanceResponse])
async def get_maintenance_by_boat(
    boat_id: int,
    active_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Получить периоды обслуживания катера"""
    from datetime import datetime
    
    query = select(BoatMaintenance).where(BoatMaintenance.boat_id == boat_id)
    
    if active_only:
        now = datetime.now()
        # Исправляем условие: период активен, если start_time <= now <= end_time
        query = query.where(
            and_(
                BoatMaintenance.start_time <= now,
                BoatMaintenance.end_time >= now
            )
        )
    
    result = await db.execute(query.order_by(BoatMaintenance.start_time))
    periods = result.scalars().all()
    
    # Для отладки
    print(f"active_only={active_only}, now={now}, found={len(periods)}")
    for p in periods:
        print(f"  period: {p.start_time} - {p.end_time}")
    
    return periods

@router.delete("/{maintenance_id}")
async def delete_maintenance(
    maintenance_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Удалить период обслуживания (вернуть катер в работу)"""
    result = await db.execute(
        select(BoatMaintenance).where(BoatMaintenance.id == maintenance_id)
    )
    maintenance = result.scalar_one_or_none()
    if not maintenance:
        raise HTTPException(status_code=404, detail="Maintenance period not found")
    
    await db.delete(maintenance)
    await db.commit()
    return {"message": "Maintenance period deleted"}

@router.post("/", response_model=MaintenanceResponse)
async def create_maintenance(
    maintenance: MaintenanceCreate,
    db: AsyncSession = Depends(get_db)
):
    # Проверяем, что катер существует
    boat_result = await db.execute(select(Boat).where(Boat.id == maintenance.boat_id))
    if not boat_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Boat not found")
    
    if maintenance.start_time >= maintenance.end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")
    
    db_maintenance = BoatMaintenance(
        boat_id=maintenance.boat_id,
        start_time=maintenance.start_time,
        end_time=maintenance.end_time,
        reason=maintenance.reason
    )
    db.add(db_maintenance)
    await db.commit()
    await db.refresh(db_maintenance)
    return db_maintenance
