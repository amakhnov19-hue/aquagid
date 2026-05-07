from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta, date
import random

from app.database.database import get_db
from app.models.boat_model import Boat as BoatModel
from app.models.booking_model import Booking as BookingModel

router = APIRouter(prefix="/api/booking", tags=["booking"])

@router.get("/available-dates")
async def get_available_dates(
    boat_id: Optional[int] = None,
    days_ahead: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить доступные даты для бронирования
    """
    # Получаем все бронирования
    query = select(BookingModel)
    result = await db.execute(query)
    bookings = result.scalars().all()
    
    # Собираем занятые даты
    booked_dates = set()
    for booking in bookings:
        if boat_id and booking.boat_id != boat_id:
            continue
        if booking.status in ['pending', 'confirmed']:
            # Исправлено: booking.booking_date, а не booking.date
            booked_dates.add(booking.booking_date.isoformat())
    
    # Генерируем доступные даты
    available_dates = []
    today = datetime.now().date()
    
    for i in range(days_ahead):
        current_date = today + timedelta(days=i)
        date_str = current_date.isoformat()
        if date_str not in booked_dates:
            available_dates.append(date_str)
    
    return {
        "success": True,
        "available_dates": available_dates
    }

@router.get("/available-times")
async def get_available_times(
    date: str,
    boat_id: Optional[int] = None,
    duration_minutes: int = Query(120, ge=60, le=480),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить доступное время для бронирования на конкретную дату
    """
    try:
        booking_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты")
    
    # Базовые временные слоты (с 9:00 до 23:00 с шагом 30 мин)
    all_slots = []
    start_hour = 9
    end_hour = 23
    
    for hour in range(start_hour, end_hour):
        for minute in [0, 30]:
            time_str = f"{hour:02d}:{minute:02d}"
            all_slots.append({"time": time_str, "available": True})
    
    # Получаем бронирования на эту дату
    query = select(BookingModel).where(
        and_(
            BookingModel.booking_date == booking_date,
            BookingModel.status.in_(['pending', 'confirmed'])
        )
    )
    if boat_id:
        query = query.where(BookingModel.boat_id == boat_id)
        
    result = await db.execute(query)
    bookings = result.scalars().all()
    
    # Отмечаем занятые слоты
    booked_times = set()
    for booking in bookings:
        booked_times.add(booking.start_time.strftime("%H:%M"))
    
    # Обновляем доступность слотов
    for slot in all_slots:
        if slot['time'] in booked_times:
            slot['available'] = False
    
    return {
        "success": True,
        "available_slots": all_slots
    }

@router.get("/available-boats")
async def get_available_boats(
    date: str,
    time: str,
    duration_minutes: int = Query(120, ge=60, le=480),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить доступные катера на указанную дату и время
    """
    try:
        booking_date = datetime.strptime(date, "%Y-%m-%d").date()
        booking_time = datetime.strptime(time, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты или времени")
    
    # Получаем все катера
    boats_query = select(BoatModel).options(selectinload(BoatModel.photos))
    boats_result = await db.execute(boats_query)
    all_boats = boats_result.scalars().all()
    
    # Получаем бронирования на это время
    bookings_query = select(BookingModel).where(
        and_(
            BookingModel.booking_date == booking_date,
            BookingModel.start_time == booking_time,
            BookingModel.status.in_(['pending', 'confirmed'])
        )
    )
    bookings_result = await db.execute(bookings_query)
    booked_boats_ids = {b.boat_id for b in bookings_result.scalars().all()}
    
    # Фильтруем доступные катера
    available_boats = []
    for boat in all_boats:
        if boat.id not in booked_boats_ids and boat.is_active:
            boat_dict = {
                "id": boat.id,
                "name": boat.name,
                "capacity": boat.capacity,
                "price_per_hour": float(boat.price_per_hour) if boat.price_per_hour else 0,
                "description_short": boat.description_short,
                "description_full": boat.description_full,
                "boarding_address": boat.boarding_address,
                "main_photo_url": boat.main_photo_url,
                "prepayment_percent": boat.prepayment_percent or 20,
                "is_active": boat.is_active,
                "photos": [p.photo_url for p in boat.photos] if boat.photos else []
            }
            available_boats.append(boat_dict)
    
    return {
        "success": True,
        "boats": available_boats
    }