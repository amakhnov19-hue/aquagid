from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from app.database.database import get_db
from app.models.booking_model import Booking as BookingModel
from app.schemas.booking import Booking, BookingCreate

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

@router.get("/", response_model=List[Booking])
async def get_bookings(
    manager_id: Optional[int] = None,
    boat_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить список бронирований с фильтрацией"""
    query = select(BookingModel)
    
    if manager_id:
        query = query.where(BookingModel.manager_id == manager_id)
    if boat_id:
        query = query.where(BookingModel.boat_id == boat_id)
    if date_from:
        query = query.where(BookingModel.date >= date_from)
    if date_to:
        query = query.where(BookingModel.date <= date_to)
        
    result = await db.execute(query)
    bookings = result.scalars().all()
    return bookings

@router.get("/{booking_id}", response_model=Booking)
async def get_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    """Получить бронирование по ID"""
    result = await db.execute(
        select(BookingModel).where(BookingModel.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    
    return booking

@router.post("/", response_model=Booking)
async def create_booking(
    booking: BookingCreate,
    db: AsyncSession = Depends(get_db)
):
    """Создать новое бронирование"""
    db_booking = BookingModel(**booking.dict())
    db.add(db_booking)
    await db.commit()
    await db.refresh(db_booking)
    return db_booking

@router.put("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Отменить бронирование"""
    result = await db.execute(
        select(BookingModel).where(BookingModel.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    
    booking.status = "cancelled"
    await db.commit()
    
    return {"message": "Бронирование отменено"}

@router.get("/stats/prepayments")
async def get_prepayment_stats(
    manager_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить статистику по предоплатам"""
    query = select(BookingModel)
    
    if manager_id:
        query = query.where(BookingModel.manager_id == manager_id)
    if date_from:
        query = query.where(BookingModel.date >= date_from)
    if date_to:
        query = query.where(BookingModel.date <= date_to)
        
    result = await db.execute(query)
    bookings = result.scalars().all()
    
    total_prepayments = sum(b.prepayment_amount for b in bookings)
    total_bookings = len(bookings)
    avg_percent = sum(b.prepayment_percent for b in bookings) / total_bookings if total_bookings > 0 else 0
    
    return {
        "total_prepayments": total_prepayments,
        "total_bookings": total_bookings,
        "average_percent": round(avg_percent, 1)
    }
