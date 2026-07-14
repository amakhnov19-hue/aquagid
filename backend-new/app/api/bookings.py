from fastapi import APIRouter, Depends, HTTPException
import sqlalchemy
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, union_all, cast, Numeric, String, TIMESTAMP, text
from sqlalchemy import Boolean
from datetime import datetime, timedelta
import os
from typing import List
from app.core.database import get_db
from app.models.booking_model import Booking as BookingModel
from app.models.boat_model import Boat as BoatModel
from app.schemas.booking_schema import BookingCreate, BookingResponse
from app.models.google_booking_model import GoogleBooking as GoogleBookingModel
from sqlalchemy import cast, Numeric, String
from app.core.security import get_current_manager
from pydantic import BaseModel
from app.services.sync import sync_manager
from app.models.manager_model import Manager as ManagerModel

router = APIRouter(prefix="/bookings", tags=["bookings"])

async def _delete_google_event_async(google_event_id, boat_id):
    """Удаление из Google Calendar в фоне (не блокирует ответ клиенту)"""
    try:
        from app.services.sync.sync_service import sync_service
        from app.core.database import AsyncSessionLocal
        from app.models.boat_model import Boat as BoatModel
        from sqlalchemy import select
        async with AsyncSessionLocal() as db:
            boat = await db.execute(select(BoatModel).where(BoatModel.id == boat_id))
            boat = boat.scalar_one_or_none()
            manager_id = boat.manager_id if boat else None
            if manager_id:
                await sync_service.delete_event(google_event_id, manager_id)
                print(f"🗑 Событие удалено из Google Calendar: {google_event_id}")
    except Exception as e:
        print(f"⚠️ Ошибка удаления из Google Calendar: {e}")


@router.post("", response_model=BookingResponse)
async def create_booking(
    booking: BookingCreate,
    db: AsyncSession = Depends(get_db)
):
    print(f"🔍 CREATE BOOKING: {booking}", flush=True)
    print(f"Received status: {booking.status}")
    print(f"Received prepayment_amount: {booking.prepayment_amount}")
    import sys
    print(f"DEBUG messenger_type: {booking.client_messenger_type}", flush=True)
    print(f"DEBUG messenger_contact: {booking.client_messenger_contact}", flush=True)
    print(f"Received booking: prepayment_amount={booking.prepayment_amount}")

    """Создать новое бронирование"""
    
    # Проверяем, существует ли катер
    boat_result = await db.execute(
        select(BoatModel).where(BoatModel.id == booking.boat_id)
    )
    boat = boat_result.scalar_one_or_none()
    if not boat:
        raise HTTPException(status_code=404, detail="Boat not found")
    
    # Проверяем, не занято ли время
    start_datetime = datetime.combine(booking.booking_date, booking.start_time)
    end_datetime = start_datetime + timedelta(minutes=booking.duration_minutes)
    
    # Получаем все бронирования на эту дату
    existing_query = select(BookingModel).where(
        and_(
            BookingModel.boat_id == booking.boat_id,
            BookingModel.status.in_(["pending", "confirmed", "active"]),
            BookingModel.booking_date == booking.booking_date
        )
    )
    existing_result = await db.execute(existing_query)
    existing_bookings = existing_result.scalars().all()
    
    # Проверяем пересечения
    for existing in existing_bookings:
        existing_start = datetime.combine(booking.booking_date, existing.start_time)
        existing_end = existing_start + timedelta(minutes=existing.duration_minutes)
        
        if (existing_start < end_datetime) and (existing_end > start_datetime):
            raise HTTPException(
                status_code=400, 
                detail="Это время уже занято"
            )
    
    # Единый калькулятор цен
    from app.services.price_calculator import calculate
    from app.models.manager_model import Manager as ManagerModel
    
    price_per_hour = float(boat.price_per_hour) if boat.price_per_hour else 0
    hours = booking.duration_minutes / 60
    
    # Процент предоплаты ТОЛЬКО из глобальных настроек
    from sqlalchemy import text
    global_result = await db.execute(text("SELECT default_prepayment_percent FROM global_settings LIMIT 1"))
    global_row = global_result.fetchone()
    prepayment_percent = global_row[0] if global_row and global_row[0] else 15

    # Проверяем реферальный код (если передан)
    referral_discount_percent = 0
    ref_code = booking.model_dump().get('ref_code') if hasattr(booking, 'model_dump') else None
    if ref_code:
        ref_manager = await db.execute(
            select(ManagerModel).where(
                ManagerModel.referral_code == ref_code,
                ManagerModel.id == boat.manager_id,
                ManagerModel.status == 'active'
            )
        )
        ref_manager = ref_manager.scalar_one_or_none()
        if ref_manager:
            referral_discount_percent = ref_manager.referral_discount_percent or 10
            print(f"🔗 Реферальная скидка применена: {referral_discount_percent}% (менеджер: {ref_manager.full_name})")

    print(f"🔍 DEBUG CALC: price_per_hour={price_per_hour}, hours={hours}, prepayment_percent={prepayment_percent}, referral_discount={referral_discount_percent}", flush=True)
    
    result = calculate(price_per_hour, hours, prepayment_percent, referral_discount_percent)

    # Для тестовых катеров — сразу active, без оплаты
    if boat.is_test:
        booking.status = "active"
    
    # Создаем бронирование
    db_booking = BookingModel(
        ref_code=ref_code,
        boat_id=booking.boat_id,
        booking_date=booking.booking_date,
        start_time=booking.start_time,
        duration_minutes=booking.duration_minutes,
        client_name=booking.client_name,
        client_passengers=booking.client_passengers,
        client_phone=booking.client_phone,
        client_telegram=booking.client_telegram,
        client_messenger_type=booking.client_messenger_type,
        client_messenger_contact=booking.client_messenger_contact,
        client_email=booking.client_email,
        client_user_id=booking.client_user_id,
        status=booking.status if booking.status else "pending",
        total_price=result["total_price"],
        prepayment_amount=result["prepayment_amount"],
        source="client"
    )
    
    db.add(db_booking)
    await db.commit()
    await db.refresh(db_booking)

    # Отправляем WebSocket уведомление менеджеру
    try:
        from app.services.sync.websocket import ws_manager
        if boat and boat.manager_id:
            await ws_manager.send_update(boat.manager_id, "bookings_updated")
            # Telegram-уведомление менеджеру
            try:
                from app.services.telegram_service import telegram_service
                boat_info = await db.execute(
                    text("SELECT bo.name, bo.manager_id, b.client_name, b.booking_date, b.start_time, b.prepayment_amount FROM boats bo JOIN bookings b ON b.boat_id = bo.id WHERE b.id = :bid"),
                    {"bid": booking_id}
                )
                info = boat_info.fetchone()
                if info:
                    await telegram_service.notify_booking(
                        manager_id=info[1],
                        booking_id=booking_id,
                        client_name=info[2] or "Клиент",
                        boat_name=info[0],
                        date=str(info[3]),
                        time=str(info[4]),
                        amount=float(info[5] or 0),
                        db=db
                    )

            except Exception as e:
                print(f"⚠️ Ошибка Telegram-уведомления: {e}")
            print(f"📡 WebSocket уведомление отправлено менеджеру {boat.manager_id}")
    except Exception as e:
        print(f"⚠️ Ошибка WebSocket: {e}")

    # Получаем данные менеджера
    manager_result = await db.execute(
        select(ManagerModel).where(ManagerModel.id == boat.manager_id)
    )
    manager = manager_result.scalar_one_or_none()
    
    return {
        "id": db_booking.id,
        "boat_id": db_booking.boat_id,
        "booking_date": str(db_booking.booking_date),
        "start_time": str(db_booking.start_time),
        "duration_minutes": db_booking.duration_minutes,
        "status": db_booking.status,
        "total_price": db_booking.total_price,
        "prepayment_amount": db_booking.prepayment_amount,
        "created_at": str(db_booking.created_at),
        "client_name": db_booking.client_name,
        "client_phone": db_booking.client_phone,
        "client_email": db_booking.client_email or "",
        "cancellation_requested": db_booking.cancellation_requested,
        "google_event_id": db_booking.google_event_id,
        "source": db_booking.source,
        "boat": {
            "id": boat.id,
            "name": boat.name,
            "capacity": boat.capacity,
            "boarding_address": boat.boarding_address,
            "manager_name": manager.full_name if manager else None,
            "manager_company": manager.company_name if manager else None,
            "manager_phone": manager.phone if manager else None,
        }
    }

@router.get("")
async def get_bookings(
    manager_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить список бронирований"""
    if manager_id:
        result = await db.execute(
            select(BookingModel).where(
                BookingModel.boat_id.in_(
                    select(BoatModel.id).where(BoatModel.manager_id == manager_id)
                )
            ).order_by(BookingModel.booking_date.asc())
        )
    else:
        result = await db.execute(
            select(BookingModel).order_by(BookingModel.booking_date.asc())
        )
    bookings = result.scalars().all()
    # Добавляем названия катеров
    boat_ids = list(set(b.boat_id for b in bookings))
    if boat_ids:
        boats_res = await db.execute(
            text("SELECT id, name, is_breakdown FROM boats WHERE id = ANY(:ids)"),
            {"ids": boat_ids}
        )
        boat_info = {row[0]: {"name": row[1], "is_breakdown": row[2]} for row in boats_res.fetchall()}
    else:
        boat_info = {}
    for b in bookings:
        b.boat_name = boat_info.get(b.boat_id, {}).get("name", f"Катер #{b.boat_id}")
        b.is_breakdown = boat_info.get(b.boat_id, {}).get("is_breakdown", False)
    return bookings

@router.get("/stats")
async def get_bookings_stats(
    db: AsyncSession = Depends(get_db)
):
    """Статистика броней для админ-дашборда"""
    result = await db.execute(
        text("""
            SELECT 
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'active' AND booking_date = CURRENT_DATE) as today,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as week
            FROM bookings
        """)
    )
    row = result.fetchone()
    return {
        "active": row[0] or 0,
        "today": row[1] or 0,
        "cancelled": row[2] or 0,
        "week": row[3] or 0
    }

@router.get("/{booking_id}")
async def get_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить бронирование по ID с данными катера и менеджера"""
    result = await db.execute(
        select(BookingModel).where(BookingModel.id == booking_id)
    )
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Загружаем катер
    boat_result = await db.execute(
        select(BoatModel).where(BoatModel.id == booking.boat_id)
    )
    boat = boat_result.scalars().first()
    
    # Загружаем менеджера
    if boat:
        manager_result = await db.execute(
            select(ManagerModel).where(ManagerModel.id == boat.manager_id)
        )
        manager = manager_result.scalars().first()
        
        # Добавляем данные менеджера в boat
        booking.boat = {
            "id": boat.id,
            "name": boat.name,
            "manager_name": manager.full_name if manager else None,
            "manager_company": manager.company_name if manager else None,
            "manager_phone": manager.phone if manager else None,
            "manager_messengers": manager.messengers if manager else {}
        }
    
    return {
        "id": booking.id,
        "boat_id": booking.boat_id,
        "booking_date": str(booking.booking_date),
        "start_time": str(booking.start_time),
        "duration_minutes": booking.duration_minutes,
        "status": booking.status,
        "total_price": float(booking.total_price) if booking.total_price else None,
        "prepayment_amount": float(booking.prepayment_amount) if booking.prepayment_amount else None,
        "created_at": str(booking.created_at),
        "client_name": booking.client_name,
        "client_passengers": booking.client_passengers,
        "client_phone": booking.client_phone,
        "client_email": booking.client_email,
        "cancellation_requested": booking.cancellation_requested,
        "boat": booking.boat
    }

@router.get("/client/{phone}", response_model=List[BookingResponse])
async def get_client_bookings(
    phone: str,
    db: AsyncSession = Depends(get_db)
):
    """Получить все бронирования клиента по номеру телефона"""
    
    from app.models.manager_model import Manager as ManagerModel
    
    # Убираем плюс из телефона, если он есть
    clean_phone = phone.lstrip('+')
    
    # Завершаем истёкшие бронирования (включая удаление из Google Calendar)
    await complete_expired_bookings(db)
    
    # Ищем по разным форматам
    result = await db.execute(
        select(BookingModel)
        .where(
            (BookingModel.client_phone == phone) |
            (BookingModel.client_phone == f"+{clean_phone}") |
            (BookingModel.client_phone == clean_phone)
        )
        .order_by(BookingModel.booking_date.desc(), BookingModel.start_time.desc())
    )
    bookings = result.scalars().all()
    
    # Подгружаем данные о катерах и менеджерах
    result_list = []
    for booking in bookings:
        boat_result = await db.execute(
            select(BoatModel).where(BoatModel.id == booking.boat_id)
        )
        boat = boat_result.scalar_one_or_none()
        
        # Получаем данные менеджера
        manager = None
        if boat and boat.manager_id:
            manager_result = await db.execute(
                select(ManagerModel).where(ManagerModel.id == boat.manager_id)
            )
            manager = manager_result.scalar_one_or_none()
        
        booking_dict = {
            "id": booking.id,
            "boat_id": booking.boat_id,
            "booking_date": booking.booking_date,
            "start_time": booking.start_time,
            "duration_minutes": booking.duration_minutes,
            "status": booking.status,
            "created_at": booking.created_at,
            "client_name": booking.client_name,
            "client_phone": booking.client_phone,
            "client_telegram": booking.client_telegram,
            "client_messenger_type": booking.client_messenger_type,
            "client_messenger_contact": booking.client_messenger_contact,
            "cancellation_requested": booking.cancellation_requested,
            "prepayment_amount": booking.prepayment_amount,
            "total_price": booking.total_price,
            "boat": {
                "id": boat.id,
                "name": boat.name,
                "price_per_hour": boat.price_per_hour,
                "capacity": boat.capacity,
                "boarding_address": boat.boarding_address,
                "manager_name": manager.full_name if manager else None,
                "manager_company": manager.company_name if manager else None,
                "manager_phone": manager.phone if manager else None,
                "manager_messengers": manager.messengers if manager else {},                
            } if boat else None
        }
        result_list.append(booking_dict)
    
    return result_list

@router.post("/{booking_id}/confirm-payment")
async def confirm_payment(
    booking_id: int,
    db: AsyncSession = Depends(get_db)
):
    import traceback
    print(f"🔍 CONFIRM PAYMENT CALLED for {booking_id}", flush=True)
    traceback.print_stack()
    """Подтвердить оплату и активировать бронирование"""
    from sqlalchemy import text
    
    result = await db.execute(
        select(BookingModel).where(BookingModel.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == "active":
        print(f"🔍 Booking {booking_id} already active, skipping", flush=True)
        return {"message": "Already active", "id": booking_id, "status": "active"}    
    
    booking.status = "active"

    # Push-уведомления
    try:
        from app.api.push_api import send_push_internal
        info = await db.execute(
            text("SELECT bo.name, bo.manager_id, b.client_name, b.booking_date, b.start_time, b.client_phone FROM boats bo JOIN bookings b ON b.boat_id = bo.id WHERE b.id = :bid"),
            {"bid": booking_id}
        )
        row = info.fetchone()
        if row:
            await send_push_internal(db=db, title=f"🆕 Новая бронь #{booking_id}", body=f"{row[2] or 'Клиент'}, {row[0]}, {row[3]} {row[4]}", url=f"/bookings/{booking_id}", user_type="manager", user_id=str(row[1]))
    except Exception as e:
        print(f"🔍 PUSH ERROR: {e}", flush=True)

    await db.commit()
    
    # Отправляем WebSocket уведомление менеджеру
    try:
        from app.services.sync.websocket import ws_manager
        boat = await db.execute(
            select(BookingModel).where(BookingModel.id == booking_id)
        )
        booking_data = boat.scalar_one_or_none()
        if booking_data:
            boat_result = await db.execute(
                select(BookingModel).where(BookingModel.id == booking_id)
            )
            # Получаем manager_id через лодку
            from sqlalchemy import text
            manager_result = await db.execute(
                text("SELECT bo.manager_id FROM boats bo JOIN bookings b ON b.boat_id = bo.id WHERE b.id = :bid"),
                {"bid": booking_id}
            )
            manager_row = manager_result.fetchone()
            if manager_row and manager_row[0]:
                await ws_manager.send_update(manager_row[0], "bookings_updated")
                print(f"📡 WebSocket отправлен после активации брони #{booking_id}")
    except Exception as e:
        print(f"⚠️ Ошибка WebSocket при confirm_payment: {e}")
        
    # Push-уведомления
    try:
        from app.api.push_api import send_push_internal
        
        # Клиенту
        if booking.client_phone:
            await send_push_internal(
                db=db,
                title="✅ Бронирование подтверждено",
                body="Спасибо за бронирование!",
                url=f"/booking/{booking_id}",
                user_type="client",
                user_id=booking.client_phone.replace('+', '').replace(' ', '').replace('-', '')
            )
        
        # Менеджеру
        from sqlalchemy import text
        manager_result = await db.execute(
            text("SELECT bo.manager_id FROM boats bo WHERE bo.id = :bid"),
            {"bid": booking.boat_id}
        )
        manager_row = manager_result.fetchone()
        if manager_row and manager_row[0]:
            await send_push_internal(
                db=db,
                title=f"✅ Бронь #{booking_id} оплачена",
                body=f"{booking.client_name or 'Клиент'}",
                url=f"/bookings/{booking_id}",
                user_type="manager",
                user_id=str(manager_row[0])
            )
    except Exception as e:
        print(f"⚠️ Ошибка push: {e}")

    # Экспорт в Google Calendar после подтверждения оплаты
    if sync_manager.enabled:
        try:
            boat_info = await db.execute(
                text("SELECT bo.name, bo.manager_id FROM boats bo WHERE bo.id = :bid"),
                {"bid": booking.boat_id}
            )
            boat_row = boat_info.fetchone()
            if boat_row:
                booking_data = {
                    "id": booking.id,
                    "manager_id": boat_row[1],
                    "source": "client",
                    "client_name": booking.client_name,
                    "client_phone": booking.client_phone,
                    "boat_name": boat_row[0],
                    "booking_date": str(booking.booking_date),
                    "start_time": str(booking.start_time),
                    "duration_minutes": booking.duration_minutes
                }
                await sync_manager.on_booking_created(booking_data)
                print(f"✅ Экспорт в календарь для брони #{booking.id} выполнен")
        except Exception as e:
            print(f"⚠️ Ошибка экспорта в календарь: {e}")
    
    return {"message": "Бронирование активировано", "id": booking_id, "status": "active"}

@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Отменить бронирование и удалить из Google Calendar"""
    
    result = await db.execute(
        select(BookingModel).where(BookingModel.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    google_event_id = booking.google_event_id
    client_phone = booking.client_phone
    booking.status = "cancelled"
    await db.commit()

    # Push-уведомление менеджеру об отмене (быстрое)
    try:
        from app.api.push_api import send_push_internal
        boat_info = await db.execute(
            text("SELECT bo.name, bo.manager_id, b.client_name, b.booking_date FROM boats bo JOIN bookings b ON b.boat_id = bo.id WHERE b.id = :bid"),
            {"bid": booking_id}
        )
        info = boat_info.fetchone()
        if info:
            await send_push_internal(
                db=db,
                title=f"❌ Отмена брони #{booking_id}",
                body=f"{info[2] or 'Клиент'}, {info[0]}, {info[3]}",
                url=f"/bookings/{booking_id}",
                user_type="manager",
                user_id=str(info[1])
            )

            # Push-уведомление клиенту об отмене
            if client_phone:
                await send_push_internal(
                    db=db,
                    title="❌ Бронирование отменено",
                    body=f"{info[0]}, {info[3]}",
                    url=f"/booking/{booking_id}",
                    user_type="client",
                    user_id=client_phone.replace('+', '').replace(' ', '').replace('-', '')
                )
    except Exception as e:
        print(f"⚠️ Ошибка push отмены: {e}")

    # Telegram-уведомление в фоне (медленное)
    import asyncio
    asyncio.ensure_future(_send_telegram_cancellation(booking_id))

    # Удаляем из Google Calendar в фоне
    if google_event_id:
        try:
            from app.services.sync.google_calendar import google_service
            await google_service.delete_event(google_event_id, booking.boat_id)
            print(f"🗑 Событие удалено из Google Calendar: {google_event_id}")
        except Exception as e:
            print(f"⚠️ Ошибка удаления из Google Calendar: {e}")
    
    return {"message": "Бронирование отменено", "id": booking_id}

async def _send_telegram_cancellation(booking_id: int):
    """Фоновая отправка Telegram-уведомления об отмене"""
    try:
        from app.services.telegram_service import telegram_service
        from app.core.database import async_session_maker
        async with async_session_maker() as db:
            boat_info = await db.execute(
                text("SELECT bo.name, bo.manager_id, b.client_name, b.booking_date FROM boats bo JOIN bookings b ON b.boat_id = bo.id WHERE b.id = :bid"),
                {"bid": booking_id}
            )
            info = boat_info.fetchone()
            if info:
                await telegram_service.notify_cancellation(
                    manager_id=info[1],
                    booking_id=booking_id,
                    client_name=info[2] or "Клиент",
                    boat_name=info[0],
                    date=str(info[3]),
                    db=db
                )
    except Exception as e:
        print(f"⚠️ Ошибка Telegram (фон): {e}")
    
@router.post("/complete-expired")
async def complete_expired_bookings(db: AsyncSession = Depends(get_db)):
    """Завершает все активные бронирования, время которых истекло, переносит в архив, удаляет из Google Calendar"""
    
    from sqlalchemy import text
    from app.services.sync.websocket import ws_manager
    
    result = await db.execute(
        text("""
            SELECT id, boat_id, google_event_id
            FROM bookings
            WHERE status = 'active'
            AND (booking_date + start_time + (duration_minutes || ' minutes')::interval) < CURRENT_TIMESTAMP
        """)
    )
    
    expired = result.fetchall()
    manager_ids = set()
    
    for b in expired:
        booking_id, boat_id, google_event_id = b[0], b[1], b[2]
        
        # Узнаём manager_id
        boat_result = await db.execute(
            text("SELECT manager_id FROM boats WHERE id = :bid"),
            {"bid": boat_id}
        )
        boat = boat_result.fetchone()
        manager_id = boat[0] if boat else None
        
        # Копируем в архив
        await db.execute(
            text("""
                INSERT INTO bookings_archive 
                (id, boat_id, booking_date, start_time, duration_minutes, 
                total_price, status, created_at, prepayment_amount,
                google_event_id, source)
                SELECT id, boat_id, booking_date, start_time, duration_minutes,
                        total_price, 'completed', created_at, prepayment_amount,
                        google_event_id, source
                FROM bookings WHERE id = :id
            """),
            {"id": booking_id}
        )
        
        # Удаляем из активных
        await db.execute(text("DELETE FROM bookings WHERE id = :id"), {"id": booking_id})
        
        # Удаляем из Google Calendar
        if google_event_id and manager_id:
            try:
                from app.services.sync.sync_service import sync_service
                await sync_service.delete_event(google_event_id, manager_id)
                print(f"🗑 Событие {google_event_id} удалено из Google Calendar")
            except Exception as e:
                print(f"⚠️ Ошибка удаления из Google Calendar: {e}")
        
        if manager_id:
            manager_ids.add(manager_id)
    
    await db.commit()
    
    # WebSocket уведомления
    for mid in manager_ids:
        try:
            await ws_manager.send_update(mid, "bookings_updated")
        except Exception as e:
            print(f"⚠️ Ошибка WebSocket для {mid}: {e}")
    
    return {
        "success": True,
        "completed_count": len(expired),
        "message": f"Завершено {len(expired)} бронирований"
    }

@router.post("/{booking_id}/request-cancellation")
async def request_booking_cancellation(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_manager)  # менеджер или админ
):
    """Запросить отмену бронирования (со стороны менеджера/админа)"""
    
    from app.models.booking_model import Booking
    
    # Находим бронирование
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    
    # Проверяем, что бронирование активное
    if booking.status != 'active':
        raise HTTPException(status_code=400, detail="Можно отменить только активное бронирование")
    
    # Устанавливаем флаг запроса на отмену
    booking.cancellation_requested = True
    booking.cancellation_requested_at = datetime.now()
    
    await db.commit()
    
    # Отправляем уведомление клиенту через сервис
    try:
        from app.services.notification_service import notification_service
        from app.models.boat_model import Boat
        boat_result = await db.execute(select(Boat).where(Boat.id == booking.boat_id))
        boat = boat_result.scalar_one_or_none()
        
        await notification_service.notify("booking_cancel_request", {
            "booking_id": booking.id,
            "client_name": booking.client_name,
            "boat_name": boat.name if boat else "Катер",
            "date": str(booking.booking_date),
            "time": str(booking.start_time)[:5],
            "client_phone": booking.client_phone
        })
    except Exception as e:
        print(f"⚠️ Ошибка отправки уведомления: {e}")
    
    return {
        "message": "Запрос на отмену отправлен клиенту",
    }


class ConfirmCancellationRequest(BaseModel):
    phone: str

@router.post("/{booking_id}/confirm-cancellation")
async def confirm_booking_cancellation(
    booking_id: int,
    request: ConfirmCancellationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Подтвердить отмену бронирования (со стороны клиента)"""
    
    from app.models.booking_model import Booking
    
    # Находим бронирование
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    
    # Проверяем, что запрос на отмену был
    if not booking.cancellation_requested:
        raise HTTPException(status_code=400, detail="Запрос на отмену не был отправлен")
    
    # Проверяем, что бронирование ещё активно
    if booking.status != 'active':
        raise HTTPException(status_code=400, detail="Бронирование уже отменено или завершено")
    
    # Проверяем, что телефон совпадает
    client_phone_clean = booking.client_phone.lstrip('+')
    request_phone_clean = request.phone.lstrip('+')
    
    if client_phone_clean != request_phone_clean:
        raise HTTPException(status_code=403, detail="Доступ запрещён. Неверный номер телефона.")
    
        # ПЕРЕНОСИМ В АРХИВ вместо смены статуса
    from datetime import datetime
    
    try:
        from sqlalchemy import text

        google_event_id = booking.google_event_id
        boat_id = booking.boat_id
        
        # 1. Вставляем в архив
        await db.execute(
            text("""
                INSERT INTO bookings_archive 
                (id, boat_id, booking_date, start_time, duration_minutes,
                total_price, prepayment_amount, status, created_at,
                google_event_id, source, cancellation_requested,
                cancellation_requested_at, cancellation_confirmed_at)
                SELECT id, boat_id, booking_date, start_time, duration_minutes,
                        total_price, prepayment_amount, 'cancelled', created_at,
                        google_event_id, source, cancellation_requested,
                        cancellation_requested_at, NOW()
                FROM bookings WHERE id = :booking_id
            """),
            {"booking_id": booking_id}
        )
        
        # 2. Обновляем статус в архиве
        await db.execute(
            text("""
                UPDATE bookings_archive 
                SET status = 'cancelled', 
                    cancellation_confirmed_at = :now 
                WHERE id = :booking_id
            """),
            {"booking_id": booking_id, "now": datetime.now()}
        )
        
        # 3. Удаляем из активных
        await db.execute(
            text("DELETE FROM bookings WHERE id = :booking_id"),
            {"booking_id": booking_id}
        )
        
        await db.commit()
    except Exception as e:
        import traceback
        print(f"❌ ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    # Удаляем из Google Calendar
    if google_event_id:
        try:
            from app.services.sync.google_calendar import google_service
            if boat_id:
                await google_service.delete_event(google_event_id, boat_id)
                print(f"🗑 Событие удалено из Google Calendar: {google_event_id}")
        except Exception as e:
            print(f"⚠️ Ошибка удаления из Google Calendar: {e}")

    # Отправляем WebSocket уведомление менеджеру
    try:
        from app.services.sync.websocket import ws_manager
        from app.models.boat_model import Boat
        boat_result = await db.execute(select(Boat).where(Boat.id == boat_id))
        boat = boat_result.scalar_one_or_none()
        if boat and boat.manager_id:
            await ws_manager.send_update(boat.manager_id)
            print(f"📡 WebSocket уведомление отправлено менеджеру {boat.manager_id}")
    except Exception as e:
        print(f"⚠️ Ошибка WebSocket: {e}")

    return {"message": "Бронирование перенесено в архив", "booking_id": booking_id}

    # Отправляем уведомление менеджеру через сервис
    try:
        from app.services.notification_service import notification_service
        from app.models.boat_model import Boat
        boat_result = await db.execute(select(Boat).where(Boat.id == boat_id))
        boat = boat_result.scalar_one_or_none()
        
        await notification_service.notify("booking_cancelled", {
            "booking_id": booking_id,
            "client_name": booking.client_name,
            "boat_name": boat.name if boat else "Катер",
            "date": str(booking.booking_date),
            "time": str(booking.start_time)[:5],
            "manager_id": boat.manager_id if boat else None
        })
    except Exception as e:
        print(f"⚠️ Ошибка отправки уведомления: {e}")

    return {"message": "Бронирование перенесено в архив", "booking_id": booking_id}

@router.delete("/{booking_id}")
async def delete_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_manager = Depends(get_current_manager)
):
    """Удалить бронирование (только для менеджера) и событие из Google Calendar"""
    from sqlalchemy import text
    
    # 1. Получаем ВСЕ данные до удаления
    booking_result = await db.execute(
        text("""
            SELECT b.google_event_id, b.boat_id, b.source,
                   bo.manager_id as boat_manager_id
            FROM bookings b
            LEFT JOIN boats bo ON b.boat_id = bo.id
            WHERE b.id = :booking_id
        """),
        {"booking_id": booking_id}
    )
    booking_row = booking_result.fetchone()
    
    if not booking_row:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    
    google_event_id = booking_row[0]
    boat_id = booking_row[1]
    source = booking_row[2]
    boat_manager_id = booking_row[3]
    
    # Формируем ответ заранее
    response = {"message": "Бронирование удалено"}
    
    # 2. Удаляем событие из Google Calendar (если было) — ДО удаления из БД
    if google_event_id and boat_manager_id:
        try:
            from app.services.sync.sync_service import sync_service
            await sync_service.delete_event(google_event_id, boat_manager_id)
            response["google_deleted"] = True
            print(f"🗑 Событие удалено из Google Calendar: {google_event_id}")
        except Exception as e:
            response["google_deleted"] = False
            print(f"⚠️ Ошибка удаления из Google Calendar: {e}")
    else:
        response["google_deleted"] = None if not google_event_id else False
    
    # 3. Удаляем бронь из БД
    await db.execute(
        text("DELETE FROM bookings WHERE id = :booking_id"),
        {"booking_id": booking_id}
    )
    await db.commit()
    
    return response

@router.post("/cleanup-pending")
async def cleanup_pending_bookings(
    db: AsyncSession = Depends(get_db)
):
    """Удалить просроченные pending-брони с очисткой Google Calendar"""
    from sqlalchemy import text
    
    # Получаем все просроченные pending-брони с google_event_id
    result = await db.execute(
        text("""
            SELECT b.id, b.google_event_id, b.boat_id,
                   bo.manager_id as boat_manager_id
            FROM bookings b
            JOIN boats bo ON b.boat_id = bo.id
            WHERE b.status = 'pending' 
              AND b.created_at < NOW() - INTERVAL '10 minutes'
        """)
    )
    expired = result.fetchall()
    
    deleted_count = 0
    gc_deleted = 0
    
    for row in expired:
        booking_id = row[0]
        google_event_id = row[1]
        boat_id = row[2]
        boat_manager_id = row[3]
        
        # Удаляем из GC
        if google_event_id and boat_manager_id:
            try:
                from app.services.sync.sync_service import sync_service
                await sync_service.delete_event(google_event_id, boat_manager_id)
                gc_deleted += 1
                print(f"🗑 Удалено из GC: {google_event_id}")
            except Exception as e:
                print(f"⚠️ Ошибка удаления из GC: {e}")
        
        # Удаляем из БД
        await db.execute(
            text("DELETE FROM bookings WHERE id = :id"),
            {"id": booking_id}
        )
        deleted_count += 1
        
        # Отправляем WebSocket
        if boat_manager_id:
            try:
                from app.services.sync.websocket import ws_manager
                await ws_manager.send_update(boat_manager_id, "bookings_updated")
            except Exception as e:
                print(f"⚠️ Ошибка WebSocket: {e}")
    
    await db.commit()
    
    return {
        "success": True,
        "deleted": deleted_count,
        "gc_deleted": gc_deleted,
        "message": f"Удалено {deleted_count} просроченных броней, {gc_deleted} событий в GC"
    }

@router.put("/{booking_id}/view")
async def mark_booking_viewed(
    booking_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(BookingModel).where(BookingModel.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Бронь не найдена")
    
    booking.viewed_at = datetime.utcnow()
    await db.commit()
    return {"message": "OK"}
