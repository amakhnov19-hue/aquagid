"""Тестовый платёжный модуль (только для beta)"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(prefix="/test", tags=["test"])

@router.post("/webhook/tbank")
async def test_tbank_webhook(order_id: str, db: AsyncSession = Depends(get_db)):
    if os.getenv("ENVIRONMENT") != "beta":
        raise HTTPException(status_code=403, detail="Только для beta")
    
    booking_id = int(order_id.split("_")[0]) if "_" in order_id else int(order_id)
    
    await db.execute(
        text("UPDATE bookings SET status = 'active', payment_status = 'paid' WHERE id = :bid"),
        {"bid": booking_id})
    await db.commit()
    
    # Экспорт в Google Calendar
    try:
        from app.services.sync.google_calendar import google_service
        await google_service.export_booking(booking_id)
    except Exception as e:
        print(f"Export error: {e}")
    
    return {"success": True, "booking_id": booking_id}
