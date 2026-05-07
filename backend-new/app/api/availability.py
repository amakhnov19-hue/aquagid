from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from datetime import date, time, datetime, timedelta
from typing import List, Optional
from app.core.database import get_db
from app.models.boat_model import Boat as BoatModel
from app.models.booking_model import Booking as BookingModel
from app.schemas.booking_schema import AvailabilityCheck, AvailabilityResponse
from app.models.manager_model import Manager as ManagerModel
from app.models.boat_maintenance_model import BoatMaintenance

router = APIRouter(prefix="/availability", tags=["availability"])

async def get_available_slots_internal(boat_id: int, booking_date: date, db: AsyncSession):
    """Внутренняя функция для получения слотов катера"""
    from sqlalchemy import text
    from datetime import datetime, timedelta
    
    boat_result = await db.execute(
        text("SELECT manager_id FROM boats WHERE id = :boat_id"),
        {"boat_id": boat_id}
    )
    boat = boat_result.fetchone()
    if not boat:
        return []
    
    manager_id = boat[0]
    
    settings_result = await db.execute(
        text("SELECT work_start, work_end FROM manager_settings WHERE manager_id = :manager_id"),
        {"manager_id": manager_id}
    )
    settings = settings_result.fetchone()
    
    global_result = await db.execute(text("SELECT work_start, work_end FROM global_settings LIMIT 1"))
    global_settings = global_result.fetchone()
    
    work_start = None
    work_end = None
    
    if settings and settings[0] and settings[1]:
        work_start = settings[0]
        work_end = settings[1]
    elif global_settings and global_settings[0] and global_settings[1]:
        work_start = global_settings[0]
        work_end = global_settings[1]
    else:
        work_start = "11:00"
        work_end = "23:30"
    
    start_dt = datetime.combine(booking_date, datetime.strptime(work_start, "%H:%M").time())
    end_dt = datetime.combine(booking_date, datetime.strptime(work_end, "%H:%M").time())

    today = datetime.now().date()
    if booking_date == today:
        now = datetime.now()
        current_minutes = now.hour * 60 + now.minute
        rounded_minutes = ((current_minutes + 29) // 30) * 30
        rounded_hour = rounded_minutes // 60
        rounded_min = rounded_minutes % 60
        rounded_time = datetime.strptime(f"{rounded_hour:02d}:{rounded_min:02d}", "%H:%M").time()
        current_dt = datetime.combine(booking_date, rounded_time)
        if current_dt > start_dt:
            start_dt = current_dt
    
    bookings_result = await db.execute(
        text("""
            SELECT start_time, duration_minutes
            FROM bookings
            WHERE boat_id = :boat_id
            AND booking_date = :date
            AND status = 'active'
            ORDER BY start_time
        """),
        {"boat_id": boat_id, "date": booking_date}
    )
    bookings = bookings_result.fetchall()
    
    busy_intervals = []
    for booking in bookings:
        booking_start = datetime.combine(booking_date, booking[0])
        booking_end = booking_start + timedelta(minutes=booking[1] + 30)
        busy_intervals.append((booking_start, booking_end))
    
    if busy_intervals:
        busy_intervals.sort()
        merged = [busy_intervals[0]]
        for current in busy_intervals[1:]:
            if current[0] <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(merged[-1][1], current[1]))
            else:
                merged.append(current)
        busy_intervals = merged
    
    free_intervals = []
    current_time = start_dt
    
    for busy_start, busy_end in busy_intervals:
        if current_time < busy_start:
            free_intervals.append((current_time, busy_start))
        current_time = max(current_time, busy_end)
    
    if current_time < end_dt:
        free_intervals.append((current_time, end_dt))
    
    # === ИСПРАВЛЕННЫЙ ЗАПРОС К BOAT_MAINTENANCE ===
    maintenance_result = await db.execute(
        select(BoatMaintenance).where(
            BoatMaintenance.boat_id == boat_id,
            BoatMaintenance.start_time < end_dt,
            BoatMaintenance.end_time > start_dt
        )
    )
    maintenance_periods = maintenance_result.scalars().all()
    
    for m in maintenance_periods:
        m_start = m.start_time.replace(tzinfo=None) if m.start_time.tzinfo else m.start_time
        m_end = m.end_time.replace(tzinfo=None) if m.end_time.tzinfo else m.end_time
        new_free_intervals = []
        for free_start, free_end in free_intervals:
            if free_start < m_start:
                new_free_intervals.append((free_start, min(free_end, m_start)))
            if free_end > m_end:
                new_free_intervals.append((max(free_start, m_end), free_end))
        free_intervals = new_free_intervals
    
    min_trip = 90
    available_slots = []
    
    for free_start, free_end in free_intervals:
        slot_time = free_start
        while slot_time + timedelta(minutes=min_trip) <= free_end:
            available_slots.append(slot_time.strftime("%H:%M"))
            slot_time += timedelta(minutes=30)
    
    return available_slots


@router.post("/check", response_model=AvailabilityResponse)
async def check_availability(
    check: AvailabilityCheck,
    db: AsyncSession = Depends(get_db)
):
    from datetime import timedelta
    from sqlalchemy import select
    
    start_datetime = datetime.combine(check.booking_date, check.start_time)
    end_datetime = start_datetime + timedelta(minutes=check.duration_minutes)
    
    query = select(BookingModel).where(
        BookingModel.boat_id == check.boat_id,
        BookingModel.booking_date == check.booking_date,
        BookingModel.status == "active"
    )
    result = await db.execute(query)
    bookings = result.scalars().all()
    
    for booking in bookings:
        booking_start = datetime.combine(check.booking_date, booking.start_time)
        booking_end = booking_start + timedelta(minutes=booking.duration_minutes)
        
        if (start_datetime < booking_end) and (end_datetime > booking_start):
            return AvailabilityResponse(
                available=False,
                boat_id=check.boat_id,
                message="Выбранное время недоступно"
            )

    # Проверка заправки и поломки
    boat_result = await db.execute(
        text("SELECT is_refueling, is_breakdown FROM boats WHERE id = :boat_id"),
        {"boat_id": check.boat_id}
    )
    boat_status = boat_result.fetchone()
    if boat_status:
        if boat_status[0]:  # is_refueling
            return AvailabilityResponse(
                available=False,
                boat_id=check.boat_id,
                message="Катер на заправке"
            )
        if boat_status[1]:  # is_breakdown
            return AvailabilityResponse(
                available=False,
                boat_id=check.boat_id,
                message="Катер сломан"
            )
    
    return AvailabilityResponse(
        available=True,
        boat_id=check.boat_id,
        message="Время доступно для бронирования"
    )


@router.get("/boats")
async def get_available_boats(
    booking_date: date,
    start_time: time,
    duration_minutes: int,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select, and_, text
    from datetime import datetime, timedelta
    from app.models.manager_model import Manager as ManagerModel
    
    start_datetime = datetime.combine(booking_date, start_time)
    end_datetime = start_datetime + timedelta(minutes=duration_minutes)
    
    boats_query = select(BoatModel).where(BoatModel.is_active == True)
    boats_result = await db.execute(boats_query)
    all_boats = boats_result.scalars().all()
    
    available_boats = []
    
    for boat in all_boats:
        manager_result = await db.execute(
            select(ManagerModel).where(ManagerModel.id == boat.manager_id)
        )
        manager = manager_result.scalar_one_or_none()
        
        settings_result = await db.execute(
            text("SELECT season_start, season_end FROM manager_settings WHERE manager_id = :manager_id"),
            {"manager_id": boat.manager_id}
        )
        settings = settings_result.fetchone()
        
        global_result = await db.execute(
            text("SELECT season_start, season_end FROM global_settings LIMIT 1")
        )
        global_settings = global_result.fetchone()
        
        season_start = None
        season_end = None
        
        if settings and settings[0] and settings[1]:
            season_start = datetime.strptime(settings[0], "%Y-%m-%d").date()
            season_end = datetime.strptime(settings[1], "%Y-%m-%d").date()
        elif global_settings and global_settings[0] and global_settings[1]:
            season_start = datetime.strptime(global_settings[0], "%Y-%m-%d").date()
            season_end = datetime.strptime(global_settings[1], "%Y-%m-%d").date()
        
        if season_start and season_end:
            if booking_date < season_start or booking_date > season_end:
                continue
        
        bookings_query = select(BookingModel).where(
            and_(
                BookingModel.boat_id == boat.id,
                BookingModel.booking_date == booking_date,
                BookingModel.status == "active"
            )
        )
        bookings_result = await db.execute(bookings_query)
        bookings = bookings_result.scalars().all()

        # === ИСПРАВЛЕННЫЙ ЗАПРОС К BOAT_MAINTENANCE ===
        maintenance_result = await db.execute(
            select(BoatMaintenance).where(
                BoatMaintenance.boat_id == boat.id,
                BoatMaintenance.start_time < end_datetime,
                BoatMaintenance.end_time > start_datetime
            )
        )
        if maintenance_result.scalar_one_or_none():
            continue
        
        is_available = True
        start_minutes = start_time.hour * 60 + start_time.minute
        end_minutes = start_minutes + duration_minutes
        
        for booking in bookings:
            booking_start_minutes = booking.start_time.hour * 60 + booking.start_time.minute
            booking_end_minutes = booking_start_minutes + booking.duration_minutes
            
            if not (end_minutes + 30 <= booking_start_minutes or start_minutes >= booking_end_minutes + 30):
                is_available = False
                break
        
        if is_available:
            available_boats.append({
                "id": boat.id,
                "name": boat.name,
                "capacity": boat.capacity,
                "price_per_hour": float(boat.price_per_hour) if boat.price_per_hour else 0,
                "main_photo_url": boat.main_photo_url,
                "description_short": boat.description_short,
                "boarding_address": boat.boarding_address,
                "manager_name": manager.full_name if manager else None,
                "manager_company": manager.company_name if manager else None,
                "manager_phone": manager.phone if manager else None
            })
    
    return {
        "success": True,
        "boats": available_boats
    }


@router.get("/available-dates")
async def get_available_dates(
    boat_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    from datetime import date, timedelta
    from sqlalchemy import text
    from datetime import datetime
    
    today = date.today()
    
    global_result = await db.execute(
        text("SELECT season_start, season_end FROM global_settings LIMIT 1")
    )
    global_row = global_result.fetchone()
    
    if not global_row or not global_row[0] or not global_row[1]:
        return {"success": True, "dates": []}
    
    season_start = datetime.strptime(global_row[0], "%Y-%m-%d").date()
    season_end = datetime.strptime(global_row[1], "%Y-%m-%d").date()
    
    if boat_id:
        boat_result = await db.execute(
            text("SELECT manager_id FROM boats WHERE id = :boat_id"),
            {"boat_id": boat_id}
        )
        boat = boat_result.fetchone()
        
        if boat:
            settings_result = await db.execute(
                text("SELECT season_start, season_end FROM manager_settings WHERE manager_id = :manager_id"),
                {"manager_id": boat[0]}
            )
            settings = settings_result.fetchone()
            
            if settings and settings[0] and settings[1]:
                manager_start = datetime.strptime(settings[0], "%Y-%m-%d").date()
                manager_end = datetime.strptime(settings[1], "%Y-%m-%d").date()
                season_start = max(season_start, manager_start)
                season_end = min(season_end, manager_end)
    
    if today > season_end:
        return {"success": True, "dates": []}
    
    start_date = max(today, season_start)
    
    available_dates = []
    current = start_date
    while current <= season_end:
        available_dates.append(current.isoformat())
        current += timedelta(days=1)
    
    return {
        "success": True,
        "dates": available_dates
    }


@router.get("/available-slots")
async def get_available_slots(
    boat_id: int,
    booking_date: date,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import text
    from datetime import datetime, timedelta
    
    boat_result = await db.execute(
        text("SELECT manager_id FROM boats WHERE id = :boat_id"),
        {"boat_id": boat_id}
    )
    boat = boat_result.fetchone()
    if not boat:
        raise HTTPException(status_code=404, detail="Boat not found")
    
    settings_result = await db.execute(
        text("SELECT work_start, work_end FROM manager_settings WHERE manager_id = :manager_id"),
        {"manager_id": boat[0]}
    )
    settings = settings_result.fetchone()
    
    work_start = "11:00"
    work_end = "23:30"

    if settings and settings[0] is not None:
        work_start = settings[0]
    if settings and settings[1] is not None:
        work_end = settings[1]

    if settings is None or settings[0] is None or settings[1] is None:
        global_result = await db.execute(
            text("SELECT work_start, work_end FROM global_settings LIMIT 1")
        )
        global_settings = global_result.fetchone()
        if global_settings:
            if work_start == "11:00" or (settings and settings[0] is None):
                work_start = global_settings[0] or "11:00"
            if work_end == "23:30" or (settings and settings[1] is None):
                work_end = global_settings[1] or "23:30"
    
    start_dt = datetime.combine(booking_date, datetime.strptime(work_start, "%H:%M").time())
    end_dt = datetime.combine(booking_date, datetime.strptime(work_end, "%H:%M").time())
    start_dt = start_dt.replace(tzinfo=None)
    end_dt = end_dt.replace(tzinfo=None)

    today = datetime.now().date()
    if booking_date == today:
        now = datetime.now()
        current_minutes = now.hour * 60 + now.minute
        rounded_minutes = ((current_minutes + 29) // 30) * 30
        rounded_hour = rounded_minutes // 60
        rounded_min = rounded_minutes % 60
        rounded_time = datetime.strptime(f"{rounded_hour:02d}:{rounded_min:02d}", "%H:%M").time()
        current_dt = datetime.combine(booking_date, rounded_time)
        if current_dt > start_dt:
            start_dt = current_dt
    
    bookings_result = await db.execute(
        text("""
            SELECT start_time, duration_minutes
            FROM bookings
            WHERE boat_id = :boat_id
            AND booking_date = :date
            AND status = 'active'
            ORDER BY start_time
        """),
        {"boat_id": boat_id, "date": booking_date}
    )
    bookings = bookings_result.fetchall()
    
    busy_intervals = []
    for booking in bookings:
        booking_start = datetime.combine(booking_date, booking[0])
        booking_end = booking_start + timedelta(minutes=booking[1] + 30)
        busy_intervals.append((booking_start, booking_end))
    
    if busy_intervals:
        busy_intervals.sort()
        merged = [busy_intervals[0]]
        for current in busy_intervals[1:]:
            if current[0] <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(merged[-1][1], current[1]))
            else:
                merged.append(current)
        busy_intervals = merged
    
    free_intervals = []
    current_time = start_dt
    
    for busy_start, busy_end in busy_intervals:
        if current_time < busy_start:
            free_intervals.append((current_time, busy_start))
        current_time = max(current_time, busy_end)
    
    if current_time < end_dt:
        free_intervals.append((current_time, end_dt))
    
    # === ИСПРАВЛЕННЫЙ ЗАПРОС К BOAT_MAINTENANCE ===
    maintenance_result = await db.execute(
        select(BoatMaintenance).where(
            BoatMaintenance.boat_id == boat_id,
            BoatMaintenance.start_time < end_dt,
            BoatMaintenance.end_time > start_dt
        )
    )
    maintenance_periods = maintenance_result.scalars().all()

    
    print(f"DEBUG: start_dt={start_dt}, end_dt={end_dt}")
    for m in maintenance_periods:
        print(f"DEBUG: m_start={m.start_time}, m_end={m.end_time}")
        print(f"DEBUG: m_start < end_dt = {m.start_time < end_dt}")
        print(f"DEBUG: m_end > start_dt = {m.end_time > start_dt}")
        m_start = m.start_time.replace(tzinfo=None) if m.start_time.tzinfo else m.start_time
        m_end = m.end_time.replace(tzinfo=None) if m.end_time.tzinfo else m.end_time
        new_free_intervals = []
        for free_start, free_end in free_intervals:
            if free_start < m_start:
                new_free_intervals.append((free_start, min(free_end, m_start)))
            if free_end > m_end:
                new_free_intervals.append((max(free_start, m_end), free_end))
        free_intervals = new_free_intervals
    
    min_trip = 90
    available_slots = []
    
    for free_start, free_end in free_intervals:
        slot_time = free_start
        while slot_time + timedelta(minutes=min_trip) <= free_end:
            available_slots.append(slot_time.strftime("%H:%M"))
            slot_time += timedelta(minutes=30)
    
    return {
        "success": True,
        "boat_id": boat_id,
        "date": booking_date.isoformat(),
        "slots": available_slots
    }


@router.get("/available-slots-global")
async def get_available_slots_global(
    booking_date: date,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import text
    from datetime import datetime, timedelta
    
    boats_result = await db.execute(
        text("SELECT id FROM boats WHERE is_active = true")
    )
    boats = boats_result.fetchall()
    
    if not boats:
        return {"success": True, "date": booking_date.isoformat(), "slots": []}
    
    all_slots = set()
    
    for boat in boats:
        boat_slots = await get_available_slots_internal(boat[0], booking_date, db)
        for slot in boat_slots:
            all_slots.add(slot)
    
    sorted_slots = sorted(all_slots)
    
    return {
        "success": True,
        "date": booking_date.isoformat(),
        "slots": sorted_slots
    }


async def check_availability_internal(
    boat_id: int,
    booking_date: date,
    start_time: time,
    duration_minutes: int,
    db: AsyncSession
) -> bool:
    from datetime import datetime, timedelta
    from sqlalchemy import select
    from app.models.booking_model import Booking as BookingModel
    from app.models.boat_maintenance_model import BoatMaintenance
    
    start_datetime = datetime.combine(booking_date, start_time)
    end_datetime = start_datetime + timedelta(minutes=duration_minutes)
    
    query = select(BookingModel).where(
        BookingModel.boat_id == boat_id,
        BookingModel.booking_date == booking_date,
        BookingModel.status == "active"
    )
    result = await db.execute(query)
    bookings = result.scalars().all()
    
    for booking in bookings:
        booking_start = datetime.combine(booking_date, booking.start_time)
        booking_end = booking_start + timedelta(minutes=booking.duration_minutes + 30)
        
        if start_datetime < booking_end and end_datetime > booking_start:
            return False
    
    # === ИСПРАВЛЕННЫЙ ЗАПРОС К BOAT_MAINTENANCE ===
    maintenance_result = await db.execute(
        select(BoatMaintenance).where(
            BoatMaintenance.boat_id == boat_id,
            BoatMaintenance.start_time < end_datetime,
            BoatMaintenance.end_time > start_datetime
        )
    )
    if maintenance_result.scalar_one_or_none():
        return False
    
    return True