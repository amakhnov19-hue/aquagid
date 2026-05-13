from fastapi import APIRouter, Depends, HTTPException
import sqlalchemy
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, union_all, cast, Numeric, String, TIMESTAMP
from sqlalchemy import Boolean
from datetime import datetime, timedelta
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

@router.post("", response_model=BookingResponse)
async def create_booking(
    booking: BookingCreate,
    db: AsyncSession = Depends(get_db)
):
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
    
    price_per_hour = float(boat.price_per_hour) if boat.price_per_hour else 0
    hours = booking.duration_minutes / 60
    
    # Процент предоплаты ТОЛЬКО из глобальных настроек
    from sqlalchemy import text
    global_result = await db.execute(text("SELECT default_prepayment_percent FROM global_settings LIMIT 1"))
    global_row = global_result.fetchone()
    prepayment_percent = global_row[0] if global_row and global_row[0] else 15

    print(f"🔍 DEBUG CALC: price_per_hour={price_per_hour}, hours={hours}, prepayment_percent={prepayment_percent}, result_total={price_per_hour * hours}, result_prepayment={price_per_hour * hours * prepayment_percent / 100}", flush=True)
    
    result = calculate(price_per_hour, hours, prepayment_percent)
    
    # Создаем бронирование
    db_booking = BookingModel(
        boat_id=booking.boat_id,
        booking_date=booking.booking_date,
        start_time=booking.start_time,
        duration_minutes=booking.duration_minutes,
        client_name=booking.client_name,
        client_phone=booking.client_phone,
        client_telegram=booking.client_telegram,
        client_messenger_type=booking.client_messenger_type,
        client_messenger_contact=booking.client_messenger_contact,
        client_user_id=booking.client_user_id,
        status=booking.status if booking.status else "active",
        total_price=result["total_price"],
        prepayment_amount=result["prepayment_amount"],
        source="client"
    )
    
    db.add(db_booking)
    await db.commit()
    await db.refresh(db_booking)

    # Автоматический экспорт в Google Calendar через sync_manager
    if sync_manager.enabled:
        try:
            booking_data = {
                "id": db_booking.id,
                "manager_id": boat.manager_id,
                "source": "client",
                "client_name": db_booking.client_name,
                "client_phone": db_booking.client_phone,
                "boat_name": boat.name,
                "booking_date": str(db_booking.booking_date),
                "start_time": str(db_booking.start_time),
                "duration_minutes": db_booking.duration_minutes
            }
            await sync_manager.on_booking_created(booking_data)
            print(f"✅ Экспорт в календарь для бронирования #{db_booking.id} выполнен")
        except Exception as e:
            print(f"⚠️ Ошибка экспорта в календарь: {e}")
    
    # Отправляем WebSocket уведомление менеджеру
    try:
        from app.services.sync.websocket import ws_manager
        if boat and boat.manager_id:
            await ws_manager.send_update(boat.manager_id, "bookings_updated")
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

@router.get("", response_model=List[BookingResponse])
async def get_bookings(
    manager_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить список бронирований (только активные)"""
    
    boat_ids_result = await db.execute(
        select(BoatModel.id).where(BoatModel.manager_id == manager_id)
    )
    boat_ids = [row[0] for row in boat_ids_result.all()]
    
    result = await db.execute(
        select(BookingModel)
        .where(BookingModel.boat_id.in_(boat_ids))
        .where(BookingModel.status == 'active')
        .order_by(BookingModel.booking_date.asc())
    )
    bookings = result.scalars().all()
    
    boats_result = await db.execute(
        select(BoatModel).where(BoatModel.id.in_([b.boat_id for b in bookings]))
    )
    boats = {b.id: b for b in boats_result.scalars().all()}
    
    result_list = []
    for b in bookings:
        boat = boats.get(b.boat_id)
        result_list.append({
            "id": b.id,
            "boat_id": b.boat_id,
            "booking_date": b.booking_date,
            "start_time": b.start_time,
            "duration_minutes": b.duration_minutes,
            "status": b.status,
            "total_price": b.total_price,
            "prepayment_amount": b.prepayment_amount,
            "created_at": b.created_at,
            "client_name": b.client_name,
            "client_phone": b.client_phone,
            "client_telegram": b.client_telegram,
            "client_messenger_type": b.client_messenger_type,
            "client_messenger_contact": b.client_messenger_contact,
            "google_event_id": b.google_event_id,
            "source": b.source,
            "cancellation_requested": b.cancellation_requested,
            "viewed_at": b.viewed_at.isoformat() if b.viewed_at else None,
            "boat": {
                "id": boat.id,
                "name": boat.name,
                "capacity": boat.capacity,
                "boarding_address": boat.boarding_address
            } if boat else None
        })
    
    return result_list

@router.get("/client/{phone}", response_model=List[BookingResponse])
async def get_client_bookings(
    phone: str,
    db: AsyncSession = Depends(get_db)
):
    """Получить все бронирования клиента по номеру телефона"""
    
    from app.models.manager_model import Manager as ManagerModel
    
    # Убираем плюс из телефона, если он есть
    clean_phone = phone.lstrip('+')
    
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
    """Подтвердить оплату и активировать бронирование"""
    
    result = await db.execute(
        select(BookingModel).where(BookingModel.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking.status = "active"
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
    booking.status = "cancelled"
    await db.commit()
    
    # Удаляем из Google Calendar
    if google_event_id:
        try:
            from app.services.sync.sync_service import sync_service
            boat_result = await db.execute(
                select(BoatModel).where(BoatModel.id == booking.boat_id)
            )
            boat = boat_result.scalar_one_or_none()
            manager_id = boat.manager_id if boat else None
            if manager_id:
                await sync_service.delete_event(google_event_id, manager_id)
                print(f"🗑 Событие удалено из Google Calendar: {google_event_id}")
        except Exception as e:
            print(f"⚠️ Ошибка удаления из Google Calendar: {e}")
    
    return {"message": "Бронирование отменено", "id": booking_id}

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
            from app.services.sync.sync_service import sync_service
            from app.models.boat_model import Boat
            boat_result = await db.execute(select(Boat).where(Boat.id == boat_id))
            boat = boat_result.scalar_one_or_none()
            manager_id = boat.manager_id if boat else None
            if manager_id:
                await sync_service.delete_event(google_event_id, manager_id)
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
            SELECT b.google_event_id, b.boat_id, b.source, b.manager_id as booking_manager_id,
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
    source = booking_row[2]  # 'google' или 'manual'
    booking_manager_id = booking_row[3]
    boat_manager_id = booking_row[4]
    
    # 2. Удаляем бронь из БД
    await db.execute(
        text("DELETE FROM bookings WHERE id = :booking_id"),
        {"booking_id": booking_id}
    )
    await db.commit()
    
    # 3. Удаляем событие из Google Calendar (если было)
    if google_event_id:
        # Определяем, чей календарь использовать
        manager_id_for_calendar = booking_manager_id or boat_manager_id
        
        if manager_id_for_calendar:
            try:
                from app.services.sync.sync_service import sync_service
                await sync_service.delete_event(google_event_id, manager_id_for_calendar)
                print(f"🗑 Событие удалено из Google Calendar: {google_event_id}")
                print(f"   Менеджер: {manager_id_for_calendar}, Источник: {source}")
            except Exception as e:
                response["google_deleted"] = False  # Не удалось удалить из GC
                print(f"⚠️ Ошибка удаления из Google Calendar: {e}")
                print(f"   event_id={google_event_id}, manager_id={manager_id_for_calendar}")
        else:
            print(f"⚠️ Не найден manager_id для удаления события GC: {google_event_id}")
    
    # Формируем ответ
    response = {"message": "Бронирование удалено"}
    
    if google_event_id:
        response["google_deleted"] = True  # По умолчанию считаем что удалили
    else:
        response["google_deleted"] = None  # Нечего было удалять
    
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
        boat_manager_id = row[4]
        
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