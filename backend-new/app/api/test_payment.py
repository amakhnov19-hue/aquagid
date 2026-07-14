"""Тестовый платёжный модуль (только для beta)"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db, AsyncSessionLocal


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

@router.post("/init-payment")
async def test_init_payment(booking_id: int, success_url: str = None):
    """Имитация инициализации платежа — возвращает URL для редиректа"""
    if os.getenv("ENVIRONMENT") != "beta":
        raise HTTPException(status_code=403, detail="Только для beta")
    
    # Формируем URL, который сразу подтвердит платёж и редиректнет на успех
    redirect_url = f"/api/test/confirm-payment?booking_id={booking_id}&success_url={success_url or '/'}"
    
    return {
        "success": True,
        "payment_url": redirect_url,
        "payment_id": f"test_{booking_id}"
    }

@router.get("/confirm-payment")
async def test_confirm_payment(booking_id: int, success_url: str = None):
    """Подтверждение тестового платежа и редирект на экран успеха"""
    if os.getenv("ENVIRONMENT") != "beta":
        raise HTTPException(status_code=403, detail="Только для beta")
    
    async with AsyncSessionLocal() as db:
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
    
    from fastapi.responses import RedirectResponse
    default_url = "https://beta.24aquabooking.ru/?payment=success" if os.getenv("ENVIRONMENT") == "beta" else "/?payment=success"
    redirect = success_url or default_url
    return RedirectResponse(url=redirect)
