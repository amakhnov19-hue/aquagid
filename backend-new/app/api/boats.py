from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from sqlalchemy import delete
from sqlalchemy import text
from datetime import date, datetime, timedelta
from typing import List
from app.core.database import get_db
from app.core.security import get_current_manager
from app.core.config import settings
from app.models.boat_model import Boat as BoatModel
from app.schemas.boat_schema import Boat, BoatCreate, BoatUpdate, BoatListItem
from app.models.boat_photo_model import BoatPhoto
from app.models.manager_model import Manager as ManagerModel
from app.models.manager_settings_model import ManagerSettings
from app.models.booking_model import Booking as BookingModel

router = APIRouter(prefix="/boats", tags=["boats"])

@router.get("")
async def get_boats(
    manager_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить список катеров"""
    
    from sqlalchemy import select
    from app.models.manager_model import Manager as ManagerModel
    
    query = select(BoatModel)
    if manager_id:
        query = query.where(BoatModel.manager_id == manager_id)

    # ВСЕГДА фильтруем удалённые катера
    query = query.where(BoatModel.deleted_at == None)
    
    result = await db.execute(query)
    boats = result.scalars().all()
    
    today = date.today()

    boat_list = []
    for boat in boats:
        # Получаем данные менеджера
        manager_result = await db.execute(
            select(ManagerModel).where(ManagerModel.id == boat.manager_id)
        )
        manager = manager_result.scalar_one_or_none()

        # Получаем настройки менеджера
        settings_result = await db.execute(
            select(ManagerSettings).where(ManagerSettings.manager_id == boat.manager_id)
        )
        manager_settings = settings_result.scalar_one_or_none()

        # Берем max_duration из настроек, если есть, иначе 8
        max_duration = 8

        print(f"🔍 Boat {boat.name}, manager_id={boat.manager_id}")
        print(f"   settings_result: {settings_result}")
        print(f"   manager_settings: {manager_settings}")
        if manager_settings:
            print(f"   max_duration from DB: {manager_settings.max_duration}")
        if manager_settings and manager_settings.max_duration:
            max_duration = manager_settings.max_duration

        # Считаем бронирования
        total_result = await db.execute(
            select(func.count(BookingModel.id)).where(
                BookingModel.boat_id == boat.id,
                BookingModel.status == 'active',
                BookingModel.booking_date >= today
            )
        )
        bookings_total = total_result.scalar() or 0
        
        today_result = await db.execute(
            select(func.count(BookingModel.id)).where(
                BookingModel.boat_id == boat.id,
                BookingModel.status == 'active',
                BookingModel.booking_date == today
            )
        )
        bookings_today = today_result.scalar() or 0
        
        boat_dict = {
            "id": boat.id,
            "name": boat.name,
            "capacity": boat.capacity,
            "is_active": boat.is_active,
            "price_per_hour": float(boat.price_per_hour) if boat.price_per_hour else 0,
            "main_photo_url": boat.main_photo_url,
            "description_short": boat.description_short,
            "boarding_address": boat.boarding_address,
            "manager_id": boat.manager_id,
            "manager_name": manager.full_name if manager else None,
            "manager_company": manager.company_name if manager else None,
            "manager_phone": manager.phone if manager else None,
            "manager_messengers": manager.messengers if manager else {},
            "latitude": boat.latitude,    
            "longitude": boat.longitude,  
            "max_duration": max_duration,
            "bookings_today": bookings_today,
            "bookings_total": bookings_total,
            "has_canopy": boat.has_canopy,   
            "has_toilet": boat.has_toilet,
            "has_audio": boat.has_audio,
            "has_fridge": boat.has_fridge,
            "has_blankets": boat.has_blankets,
            "has_kitchenware": boat.has_kitchenware,
            "pricing_method": boat.pricing_method,
            "open_price": float(boat.open_price) if boat.open_price else None,
            "agent_price": float(boat.agent_price) if boat.agent_price else None,
            "is_refueling": boat.is_refueling,
            "is_breakdown": boat.is_breakdown,
            "require_approval": getattr(boat, 'require_approval', False),
            "refuel_end_time": boat.refuel_end_time.isoformat() if boat.refuel_end_time else None,
            "has_maintenance": boat.has_maintenance,
            "maintenance_start": boat.maintenance_start.isoformat() if boat.maintenance_start else None,
            "maintenance_end": boat.maintenance_end.isoformat() if boat.maintenance_end else None,
            # Новые поля модерации
            "moderation_status": boat.moderation_status or "draft",
            "approved_price_per_hour": float(boat.approved_price_per_hour) if boat.approved_price_per_hour else None,
            "approved_prepayment_percent": boat.approved_prepayment_percent,
            "approved_open_price": float(boat.approved_open_price) if boat.approved_open_price else None,
            "approved_agent_price": float(boat.approved_agent_price) if boat.approved_agent_price else None,
        }
        boat_list.append(boat_dict)
    
    return boat_list

#@router.get("/featured", response_model=List[BoatListItem])
#async def get_featured_boats(
#    db: AsyncSession = Depends(get_db)
#):
#    """Получить рекомендуемые катера"""
#    result = await db.execute(
#        select(BoatModel)
#        .where(BoatModel.is_active == True)
#        .where(BoatModel.is_featured == True)
#    )
#    boats = result.scalars().all()
#    return boats

@router.get("/client")
async def get_client_boats(
    ref: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить катера для клиентского приложения (только активные)"""
    from sqlalchemy.orm import joinedload
    
    # Если есть реферальный код — находим менеджера
    ref_manager = None
    if ref:
        ref_result = await db.execute(
            select(ManagerModel).where(
                ManagerModel.referral_code == ref,
                ManagerModel.status == 'active'
            )
        )
        ref_manager = ref_result.scalar_one_or_none()
        if ref_manager:
            print(f"🔗 Реферальный код: {ref}, менеджер: {ref_manager.full_name}, режим: {ref_manager.referral_mode}")
    
    # Базовый запрос
    query = select(BoatModel).options(
        joinedload(BoatModel.photos)
    ).where(
        BoatModel.is_active == True,
        BoatModel.deleted_at == None
    )
    
    # Фильтрация по реферальному режиму
    if ref_manager and ref_manager.referral_mode == 'own_only':
        # Показываем только катера этого менеджера
        query = query.where(BoatModel.manager_id == ref_manager.id)
        print(f"   Режим: только свои катера (manager_id={ref_manager.id})")
    
    query = query.order_by(BoatModel.name)
    
    result = await db.execute(query)
    boats = result.unique().scalars().all()
    
    # Получаем менеджеров для катеров
    manager_ids = list(set(b.manager_id for b in boats if b.manager_id))
    managers = {}
    if manager_ids:
        manager_result = await db.execute(
            select(ManagerModel).where(ManagerModel.id.in_(manager_ids))
        )
        for m in manager_result.scalars().all():
            managers[m.id] = m
    
    return [
        {
            "id": b.id,
            "name": b.name,
            "capacity": b.capacity,
            "price_per_hour": float(b.price_per_hour) if b.price_per_hour else None,
            "open_price": float(b.open_price) if b.open_price else None,
            "agent_price": float(b.agent_price) if b.agent_price else None,
            "pricing_method": b.pricing_method,
            "prepayment_percent": b.prepayment_percent,
            "main_photo_url": b.main_photo_url,
            "description_short": b.description_short,
            "boarding_address": b.boarding_address,
            "latitude": b.latitude,
            "longitude": b.longitude,
            "has_canopy": b.has_canopy,
            "has_toilet": b.has_toilet,
            "has_audio": b.has_audio,
            "has_fridge": b.has_fridge,
            "has_blankets": b.has_blankets,
            "has_kitchenware": b.has_kitchenware,
            "photos": [p.photo_url for p in b.photos] if b.photos else [],
            "manager_id": b.manager_id,
            "manager_name": managers[b.manager_id].full_name if b.manager_id and b.manager_id in managers else None,
            "manager_company": managers[b.manager_id].company_name if b.manager_id and b.manager_id in managers else None,
            "manager_phone": managers[b.manager_id].phone if b.manager_id and b.manager_id in managers else None,
            "manager_messengers": managers[b.manager_id].messengers if b.manager_id and b.manager_id in managers else {},
        }
        for b in boats
    ]

@router.get("/{boat_id}", response_model=Boat)
async def get_boat(
    boat_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить детальную информацию о катере со всеми фотографиями"""
    
    # Получаем катер
    boat_result = await db.execute(
        text("SELECT *, require_approval FROM boats WHERE id = :id"),
        {"id": boat_id}
    )
    boat = boat_result.fetchone()
    
    if not boat:
        raise HTTPException(status_code=404, detail="Boat not found")
    
    # Получаем все фотографии этого катера
    from app.models.boat_photo_model import BoatPhoto
    photos_result = await db.execute(
        select(BoatPhoto).where(BoatPhoto.boat_id == boat_id).order_by(BoatPhoto.display_order)
    )
    photos = photos_result.scalars().all()
    
    # Преобразуем в словарь
    boat_dict = {
        "id": boat.id,
        "manager_id": boat.manager_id,
        "name": boat.name,
        "capacity": boat.capacity,
        "price_per_hour": float(boat.price_per_hour) if boat.price_per_hour else None,
        "description_full": boat.description_full,
        "description_short": boat.description_short,
        "boarding_address": boat.boarding_address,
        "latitude": boat.latitude,
        "longitude": boat.longitude,
        "main_photo_url": boat.main_photo_url,
        "captain_name": boat.captain_name,
        "prepayment_percent": boat.prepayment_percent,
        "is_active": boat.is_active,
        "activation_status": boat.activation_status,
        "created_at": boat.created_at,
        "activated_at": boat.activated_at,
        "deactivated_at": boat.deactivated_at,
        "deleted_at": boat.deleted_at,
        "has_canopy": boat.has_canopy,
        "has_toilet": boat.has_toilet,
        "has_audio": boat.has_audio,
        "has_fridge": boat.has_fridge,
        "has_blankets": boat.has_blankets,
        "has_kitchenware": boat.has_kitchenware,
        "has_maintenance": boat.has_maintenance,
        "maintenance_start": boat.maintenance_start.isoformat() if boat.maintenance_start else None,
        "maintenance_end": boat.maintenance_end.isoformat() if boat.maintenance_end else None,
        "pricing_method": boat.pricing_method,
        "open_price": float(boat.open_price) if boat.open_price else None,
        "agent_price": float(boat.agent_price) if boat.agent_price else None,
        "is_refueling": boat.is_refueling,
        "is_breakdown": boat.is_breakdown,
        "require_approval": boat._mapping.get("require_approval", False),
        "photos": [
            {
                "id": photo.id,
                "boat_id": photo.boat_id,
                "photo_url": photo.photo_url,
                "display_order": photo.display_order,
                "mime_type": photo.mime_type,
                "created_at": photo.created_at
            }
            for photo in photos
        ]
    }
    
    return boat_dict

@router.post("", response_model=Boat)
async def create_boat(
    boat: BoatCreate,
    db: AsyncSession = Depends(get_db),
    current_manager = Depends(get_current_manager)
):
    """Создать новый катер"""
    from datetime import datetime
    
    boat_data = boat.model_dump()
    boat_data["is_active"] = True
    boat_data["deleted_at"] = None
    boat_data["moderation_status"] = "pending"  # ← новый катер на модерацию
    
    # Берём manager_id из токена
    manager_id = current_manager.get("sub")
    if not manager_id:
        raise HTTPException(status_code=401, detail="Не авторизован")
    boat_data["manager_id"] = int(manager_id)
    
    db_boat = BoatModel(**boat_data)
    db.add(db_boat)
    await db.commit()
    await db.refresh(db_boat, ['photos'])
    return db_boat

@router.put("/{boat_id}", response_model=Boat)
async def update_boat(
    boat_id: int,
    boat_update: BoatUpdate,
    db: AsyncSession = Depends(get_db),
    current_manager = Depends(get_current_manager)  # ← добавляем
):
    """Обновить информацию о катере (для менеджеров/админов)"""
    result = await db.execute(
        select(BoatModel).where(BoatModel.id == boat_id)
    )
    db_boat = result.scalar_one_or_none()
    
    if not db_boat:
        raise HTTPException(status_code=404, detail="Boat not found")

    # Если устанавливается ТО, проверяем пересечение с активными бронями
    update_data = boat_update.model_dump(exclude_unset=True)
    
    if update_data.get('has_maintenance') and update_data.get('maintenance_start') and update_data.get('maintenance_end'):
        from datetime import datetime
        
        maint_start = update_data['maintenance_start']
        maint_end = update_data['maintenance_end']
        
        # Приводим к datetime, если пришли строки
        if isinstance(maint_start, str):
            maint_start = datetime.fromisoformat(maint_start.replace('Z', '+00:00'))
        if isinstance(maint_end, str):
            maint_end = datetime.fromisoformat(maint_end.replace('Z', '+00:00'))
        
        # Проверяем пересечение с активными бронями
        bookings_result = await db.execute(
            text("""
                SELECT COUNT(*) FROM bookings 
                WHERE boat_id = :boat_id 
                AND status = 'active'
                AND (booking_date + start_time) < :maint_end
                AND (booking_date + start_time + (duration_minutes || ' minutes')::interval) > :maint_start
            """),
            {"boat_id": boat_id, "maint_start": maint_start, "maint_end": maint_end}
        )
        active_bookings = bookings_result.scalar() or 0
        
        if active_bookings > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Невозможно установить ТО: в выбранный период есть {active_bookings} активных бронирований. Отмените или перенесите их."
            )
    
    # Проверяем, меняются ли ценообразующие поля
    pricing_fields = ['price_per_hour', 'prepayment_percent', 'open_price', 'agent_price', 'pricing_method']
    update_data = boat_update.model_dump(exclude_unset=True)
    
    needs_moderation = any(field in update_data for field in pricing_fields)
    
    # Обновляем поля
    for key, value in update_data.items():
        setattr(db_boat, key, value)
    
    # Если менялись цены — отправляем на модерацию
    if needs_moderation:
        db_boat.moderation_status = "pending"
    
    await db.commit()

    # Отправляем уведомление через WebSocket
    from app.services.sync.websocket import ws_manager
    if db_boat.manager_id:
        await ws_manager.send_update(db_boat.manager_id, "boats_updated")

    # Сбрасываем кэш сессии, чтобы прочитать свежие данные из БД
    db.expire_all()
    # Повторно запрашиваем катер с явной загрузкой фото
    from sqlalchemy.orm import joinedload
    result = await db.execute(
        select(BoatModel)
        .options(joinedload(BoatModel.photos))
        .where(BoatModel.id == boat_id)
    )
    db_boat = result.unique().scalar_one()
    return db_boat

@router.post("/{boat_id}/photos")
async def add_boat_photo(
    boat_id: int,
    photo: dict,
    db: AsyncSession = Depends(get_db)
):
    """Добавить фото к катеру (сохраняет файл на диск)"""
    import base64
    import uuid
    import os
    from pathlib import Path
    
    # Проверяем, существует ли катер
    result = await db.execute(
        select(BoatModel).where(BoatModel.id == boat_id)
    )
    boat = result.scalar_one_or_none()
    if not boat:
        raise HTTPException(status_code=404, detail="Boat not found")
    
    photo_url_data = photo.get("photo_url")
    if not photo_url_data:
        raise HTTPException(status_code=400, detail="photo_url is required")
    
    # Определяем, это Base64 или уже URL
    saved_url = photo_url_data
    if photo_url_data.startswith("data:image"):
        # Это Base64, нужно сохранить как файл
        try:
            # Извлекаем MIME-тип и данные
            header, base64_data = photo_url_data.split(",", 1)
            mime_type = header.split(":")[1].split(";")[0] if ":" in header else "image/jpeg"
            
            # Определяем расширение файла
            ext_map = {
                "image/jpeg": ".jpg",
                "image/jpg": ".jpg",
                "image/png": ".png",
                "image/gif": ".gif",
                "image/webp": ".webp"
            }
            ext = ext_map.get(mime_type, ".jpg")
            
            # Декодируем Base64
            file_data = base64.b64decode(base64_data)
            
            # Создаём папку для катера
            upload_base = Path(settings.UPLOAD_DIR)
            boat_dir = upload_base / str(boat_id)
            boat_dir.mkdir(parents=True, exist_ok=True)
            
            # Генерируем уникальное имя файла
            filename = f"{uuid.uuid4()}{ext}"
            file_path = boat_dir / filename
            
            # Сохраняем файл
            with open(file_path, "wb") as f:
                f.write(file_data)
            
            # Формируем URL
            saved_url = f"/uploads/boats/{boat_id}/{filename}"
            
            # Сохраняем mime_type для БД
            photo_mime_type = mime_type
            
        except Exception as e:
            print(f"Ошибка сохранения файла: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка сохранения файла: {str(e)}")
    else:
        # Это уже URL, используем как есть
        photo_mime_type = "image/jpeg"
    
    # Создаем запись в БД
    db_photo = BoatPhoto(
        boat_id=boat_id,
        photo_url=saved_url,
        display_order=photo.get("display_order", 0),
        mime_type=photo_mime_type if 'photo_mime_type' in locals() else "image/jpeg"
    )
    db.add(db_photo)
    
    # Если это первое фото, обновляем main_photo_url у катера
    photos_result = await db.execute(
        select(BoatPhoto).where(BoatPhoto.boat_id == boat_id)
    )
    photos_count = len(photos_result.scalars().all())
    
    if photos_count == 0:
        boat.main_photo_url = saved_url
        db.add(boat)
    
    await db.commit()
    await db.refresh(db_photo)
    
    return {
        "id": db_photo.id,
        "photo_url": saved_url,
        "saved_to_disk": photo_url_data.startswith("data:image")
    }

@router.put("/{boat_id}/photos/reorder")
async def reorder_photos(
    boat_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Обновить порядок фото и главное фото"""
    photo_urls = data.get("photo_urls", [])
    
    # Удаляем старые записи о порядке
    await db.execute(
        text("DELETE FROM boat_photos WHERE boat_id = :bid"),
        {"bid": boat_id}
    )
    
    # Вставляем с новым порядком
    for i, url in enumerate(photo_urls):
        await db.execute(
            text("INSERT INTO boat_photos (boat_id, photo_url, display_order) VALUES (:bid, :url, :order)"),
            {"bid": boat_id, "url": url, "order": i}
        )
    
    # Обновляем main_photo_url у катера
    if photo_urls:
        await db.execute(
            text("UPDATE boats SET main_photo_url = :url WHERE id = :bid"),
            {"bid": boat_id, "url": photo_urls[0]}
        )
    
    await db.commit()
    return {"success": True, "main_photo_url": photo_urls[0] if photo_urls else None}

@router.delete("/{boat_id}/photos")
async def delete_boat_photos(
    boat_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Удалить все фото катера"""
    result = await db.execute(
        select(BoatPhoto).where(BoatPhoto.boat_id == boat_id)
    )
    photos = result.scalars().all()
    
    for photo in photos:
        await db.delete(photo)
    
    # Обнуляем main_photo_url у катера
    boat_result = await db.execute(
        select(BoatModel).where(BoatModel.id == boat_id)
    )
    boat = boat_result.scalar_one_or_none()
    if boat:
        boat.main_photo_url = None
        db.add(boat)
    
    await db.commit()
    return {"message": "All photos deleted"}

@router.delete("/{boat_id}")
async def delete_boat(
    boat_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Полное удаление катера с проверкой активных бронирований"""
    from sqlalchemy import func
    import shutil
    from pathlib import Path
    
    # Проверяем, есть ли активные бронирования
    bookings_result = await db.execute(
        select(func.count()).select_from(BookingModel).where(
            BookingModel.boat_id == boat_id,
            BookingModel.status == 'active'
        )
    )
    active_bookings = bookings_result.scalar() or 0
    
    if active_bookings > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Невозможно удалить катер: есть {active_bookings} активных бронирований. Сначала завершите или отмените их."
        )
    
    result = await db.execute(
        select(BoatModel).where(BoatModel.id == boat_id)
    )
    boat = result.scalar_one_or_none()
    
    if not boat:
        raise HTTPException(status_code=404, detail="Катер не найден")
    
    # Удаляем фотографии с диска
    try:
        boat_dir = Path(settings.UPLOAD_DIR) / str(boat_id)
        if boat_dir.exists():
            shutil.rmtree(boat_dir)
    except Exception as e:
        print(f"Ошибка удаления папки с фото: {e}")
    
    # Удаляем записи о фото из БД
    from app.models.boat_photo_model import BoatPhoto
    await db.execute(
        delete(BoatPhoto).where(BoatPhoto.boat_id == boat_id)
    )
    
    # Полностью удаляем катер
    await db.delete(boat)
    await db.commit()
    
    return {"message": "Катер полностью удалён"}

@router.post("/{boat_id}/check-maintenance")
async def check_maintenance(
    boat_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Проверить, есть ли активные брони в указанный период"""
    from datetime import datetime
    
    start = datetime.fromisoformat(data['start'].replace('Z', '+00:00'))
    end = datetime.fromisoformat(data['end'].replace('Z', '+00:00'))
    
    result = await db.execute(
        text("""
            SELECT COUNT(*) FROM bookings 
            WHERE boat_id = :boat_id 
            AND status = 'active'
            AND (booking_date + start_time) < :end
            AND (booking_date + start_time + (duration_minutes || ' minutes')::interval) > :start
        """),
        {"boat_id": boat_id, "start": start, "end": end}
    )
    count = result.scalar() or 0
    
    return {"has_bookings": count > 0, "count": count}

def round_to_next_slot(dt: datetime) -> datetime:
    """Округляет время до ближайшего будущего 30-минутного слота"""
    minutes = dt.minute
    if minutes == 0:
        return dt.replace(second=0, microsecond=0)
    elif minutes < 30:
        return dt.replace(minute=30, second=0, microsecond=0)
    else:
        # Переходим на следующий час, минуты = 0
        return (dt + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)


@router.post("/{boat_id}/refuel")
async def toggle_refuel(
    boat_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Начать/завершить заправку"""
    from datetime import datetime, timedelta
    
    result = await db.execute(select(BoatModel).where(BoatModel.id == boat_id))
    boat = result.scalar_one_or_none()
    if not boat:
        raise HTTPException(status_code=404, detail="Катер не найден")
    
    action = data.get('action')
    
    if action == 'start':
        # Округляем текущее время до ближайшего слота
        now = datetime.now()
        start_time = round_to_next_slot(now)
        end_time = start_time + timedelta(hours=2)
        
        boat.is_refueling = True
        boat.refuel_end_time = end_time
        boat.is_active = True  # катер остаётся в списке, но слоты заблокированы
        
        # Добавляем запись в boat_maintenance
        await db.execute(
            text("""
                INSERT INTO boat_maintenance (boat_id, start_time, end_time, reason)
                VALUES (:boat_id, :start_time, :end_time, 'refuel')
            """),
            {"boat_id": boat_id, "start_time": start_time, "end_time": end_time}
        )
    else:
        boat.is_refueling = False
        boat.refuel_end_time = None
        
        # Удаляем запись о заправке
        await db.execute(
            text("DELETE FROM boat_maintenance WHERE boat_id = :boat_id AND reason = 'refuel'"),
            {"boat_id": boat_id}
        )
    
    await db.commit()
    return {"message": "OK", "is_refueling": boat.is_refueling}


@router.post("/{boat_id}/breakdown")
async def toggle_breakdown(
    boat_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Начать/завершить поломку"""
    result = await db.execute(select(BoatModel).where(BoatModel.id == boat_id))
    boat = result.scalar_one_or_none()
    if not boat:
        raise HTTPException(status_code=404, detail="Катер не найден")
    
    action = data.get('action')
    
    if action == 'start':

        # Уведомление менеджеру
        from app.api.push_api import send_push_internal
        boat_info = await db.execute(
            select(BoatModel).where(BoatModel.id == boat_id)
        )
        boat_data = boat_info.scalar_one_or_none()
        if boat_data:
            await send_push_internal(
                db=db,
                title="⚠️ Поломка катера",
                body=f"{boat_data.name} — требуется внимание",
                url=f"/boats",
                user_type="manager",
                user_id=str(boat_data.manager_id)
            )

        boat.is_breakdown = True
        boat.is_active = False
        # Помечаем будущие брони как требующие внимания
        
    else:
        boat.is_breakdown = False
        boat.is_active = True
    
    await db.commit()
    return {"message": "OK", "is_breakdown": boat.is_breakdown}

@router.get("/{boat_id}/approval-status")
async def get_approval_status(
    boat_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить статус require_approval"""
    result = await db.execute(
        text("SELECT require_approval FROM boats WHERE id = :id"),
        {"id": boat_id}
    )
    row = result.fetchone()
    return {"require_approval": row[0] if row else False}

@router.post("/{boat_id}/toggle-approval")
async def toggle_approval(
    boat_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Включить/выключить требование подтверждения брони"""
    await db.execute(
        text("UPDATE boats SET require_approval = NOT COALESCE(require_approval, false) WHERE id = :id"),
        {"id": boat_id}
    )
    await db.commit()
    
    result = await db.execute(
        text("SELECT require_approval FROM boats WHERE id = :id"),
        {"id": boat_id}
    )
    row = result.fetchone()
    return {"require_approval": row[0] if row else False}

@router.post("/check-refuel-expired")
async def check_refuel_expired(db: AsyncSession = Depends(get_db)):
    """Завершает заправки, время которых истекло"""
    
    # Завершаем заправки
    result1 = await db.execute(
        text("""
            UPDATE boats 
            SET is_refueling = false, refuel_end_time = null
            WHERE is_refueling = true AND refuel_end_time < NOW()
        """)
    )
    # Удаляем истекшие записи из boat_maintenance
    result2 = await db.execute(
        text("DELETE FROM boat_maintenance WHERE reason = 'refuel' AND end_time < NOW()")
    )
    await db.commit()
    
    return {"message": "OK"}

