from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database.database import get_db
from app.models.boat_model import Boat as BoatModel, BoatPhoto
from app.schemas.boat import Boat, BoatCreate

router = APIRouter(prefix="/api/boats", tags=["boats"])

@router.get("", response_model=List[Boat])
async def get_boats(
    manager_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Получить список катеров
    - можно фильтровать по manager_id
    """
    query = select(BoatModel).options(selectinload(BoatModel.photos))
    
    if manager_id:
        query = query.where(BoatModel.manager_id == manager_id)
        
    result = await db.execute(query)
    boats = result.scalars().all()
    
    # Преобразуем результат в список словарей для Pydantic
    result_list = []
    for boat in boats:
            boat_dict = {
                "id": boat.id,
                "manager_id": boat.manager_id,
                "name": boat.name,
                "capacity": boat.capacity,
                "price_per_hour": float(boat.price_per_hour) if boat.price_per_hour else 0,
                "description_short": boat.description_short,
                "description_full": boat.description_full,
                "boarding_address": boat.boarding_address,
                "is_active": boat.is_active,
                "created_at": boat.created_at,
                "activation_status": boat.activation_status,
                "activated_at": boat.activated_at,
                "deactivated_at": boat.deactivated_at,
                "prepayment_percent": boat.prepayment_percent or 20,
                "main_photo_url": boat.main_photo_url,
                "deleted_at": boat.deleted_at,
                "photos": [p.photo_url for p in boat.photos] if boat.photos else [],
                "latitude": float(boat.latitude) if boat.latitude else None,
                "longitude": float(boat.longitude) if boat.longitude else None
            }
            result_list.append(boat_dict)
    
    return result_list

@router.get("", response_model=List[Boat])
async def get_boats(
    manager_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Получить список катеров
    - можно фильтровать по manager_id
    """
    # Принудительно обновляем метаданные перед запросом
    async def refresh_metadata(sync_conn):
        from sqlalchemy import inspect
        insp = inspect(sync_conn)
        # Просто читаем схему, чтобы обновить кэш
        columns = insp.get_columns('boats')
        print(f"✅ Реальные колонки в БД: {[c['name'] for c in columns]}")
    
    await db.run_sync(refresh_metadata)
    
    # Основной запрос
    query = select(BoatModel).options(selectinload(BoatModel.photos))
    
    if manager_id:
        query = query.where(BoatModel.manager_id == manager_id)
        
    result = await db.execute(query)
    boats = result.scalars().all()
    
    # Преобразуем результат в список словарей для Pydantic
    result_list = []
    for boat in boats:
        # Ограничиваем количество фото до 3
        photos = [p.photo_url for p in boat.photos][:3] if boat.photos else []
        
        boat_dict = {
            "id": boat.id,
            "manager_id": boat.manager_id,
            "name": boat.name,
            "capacity": boat.capacity,
            "price_per_hour": float(boat.price_per_hour) if boat.price_per_hour else 0,
            "description_short": boat.description_short,
            "description_full": boat.description_full,
            "boarding_address": boat.boarding_address,
            "is_active": boat.is_active,
            "created_at": boat.created_at,
            "activation_status": boat.activation_status,
            "activated_at": boat.activated_at,
            "deactivated_at": boat.deactivated_at,
            "prepayment_percent": boat.prepayment_percent or 20,
            "main_photo_url": boat.main_photo_url,
            "deleted_at": boat.deleted_at,
            "photos": photos,
            "latitude": float(boat.latitude) if boat.latitude else None,
            "longitude": float(boat.longitude) if boat.longitude else None
        }
        result_list.append(boat_dict)
    
    return result_list

@router.post("/", response_model=Boat)
async def create_boat(
    boat: BoatCreate,
    db: AsyncSession = Depends(get_db)
):
    """Создать новый катер"""
    db_boat = BoatModel(**boat.model_dump(exclude={'photos'}))
    db.add(db_boat)
    await db.commit()
    await db.refresh(db_boat)
    return db_boat