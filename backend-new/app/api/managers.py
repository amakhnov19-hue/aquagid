from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.manager_model import Manager
from werkzeug.security import check_password_hash
from app.core.security import create_access_token
from app.core.security import get_current_admin, get_current_manager

router = APIRouter(prefix="/managers", tags=["managers"])

class LoginRequest(BaseModel):
    login: str
    password: str

class LoginResponse(BaseModel):
    id: int
    name: str
    token: str

@router.post("/login", response_model=LoginResponse)
async def login_manager(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # Ищем менеджера по email ИЛИ телефону
    result = await db.execute(
        select(Manager).where(
            (Manager.email == request.login) | (Manager.phone == request.login)
        )
    )
    manager = result.scalar_one_or_none()
    
    if not manager:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    
    # Проверка пароля с правильным хэшем
    if not check_password_hash(manager.password_hash, request.password):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    
    # JWT токен
    token = create_access_token({"sub": str(manager.id), "email": manager.email, "role": "manager"})
    
    return LoginResponse(
        id=manager.id,
        name=manager.full_name,
        token=token
    )

@router.get("/{manager_id}")
async def get_manager(manager_id: int, db: AsyncSession = Depends(get_db)):
    """Получить менеджера по ID"""
    result = await db.execute(
        select(Manager).where(Manager.id == manager_id)
    )
    manager = result.scalar_one_or_none()
    
    if not manager:
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    
    return manager

@router.put("/{manager_id}")
async def update_manager(
    manager_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Обновить данные менеджера"""
    result = await db.execute(
        select(Manager).where(Manager.id == manager_id)
    )
    manager = result.scalar_one_or_none()
    
    if not manager:
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    
    # Проверяем уникальность email и телефона (если они переданы и не пустые)
    email = data.get('email')
    phone = data.get('phone')
    
    if email or phone:
        query = select(Manager).where(Manager.id != manager_id)
        
        conditions = []
        if email and email.strip():
            conditions.append(Manager.email == email.strip())
        if phone and phone.strip():
            conditions.append(Manager.phone == phone.strip())
        
        if conditions:
            from sqlalchemy import or_
            query = query.where(or_(*conditions))
            
            existing = await db.execute(query)
            existing_manager = existing.scalar_one_or_none()
            
            if existing_manager:
                if existing_manager.email == email:
                    raise HTTPException(status_code=400, detail=f"Email '{email}' уже используется")
                if existing_manager.phone == phone:
                    raise HTTPException(status_code=400, detail=f"Телефон '{phone}' уже используется")
                raise HTTPException(status_code=400, detail="Email или телефон уже используются")
    
    # Обновляем поля
    if 'company_name' in data:
        manager.company_name = data['company_name']
    if 'full_name' in data:
        manager.full_name = data['full_name']
    if phone:
        manager.phone = phone.strip()
    if email:
        manager.email = email.strip()
    if 'messengers' in data:
        manager.messengers = data['messengers']
    
    await db.commit()
    await db.refresh(manager)
    
    return {"message": "Данные обновлены", "manager": manager}

@router.get("/{manager_id}/bookings-check")
async def check_manager_bookings(
    manager_id: int,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Проверить, есть ли у менеджера активные бронирования"""
    
    from app.models.booking_model import Booking
    
    # Считаем активные бронирования (статус active или confirmed)
    result = await db.execute(
        select(Booking).where(
            Booking.manager_id == manager_id,
            Booking.status.in_(['active', 'confirmed'])
        )
    )
    active_bookings = result.scalars().all()
    
    return {
        "has_active_bookings": len(active_bookings) > 0,
        "active_bookings_count": len(active_bookings)
    }

@router.put("/{manager_id}/status")
async def update_manager_status(
    manager_id: int,
    status_data: dict,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Изменить статус менеджера (active/blocked)"""
    
    from app.models.manager_model import Manager
    
    result = await db.execute(
        select(Manager).where(Manager.id == manager_id)
    )
    manager = result.scalar_one_or_none()
    
    if not manager:
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    
    new_status = status_data.get("status")
    if new_status not in ["active", "blocked"]:
        raise HTTPException(status_code=400, detail="Неверный статус")
    
    manager.status = new_status
    await db.commit()
    
    return {"message": f"Статус изменён на {new_status}", "status": new_status}

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/{manager_id}/change-password")
async def change_password(
    manager_id: int,
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Сменить пароль менеджера"""
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Пароль должен быть не менее 6 символов")
    
    result = await db.execute(
        select(Manager).where(Manager.id == manager_id)
    )
    manager = result.scalar_one_or_none()
    
    if not manager:
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    
    # Проверяем старый пароль
    if not check_password_hash(manager.password_hash, data.old_password):
        raise HTTPException(status_code=400, detail="Неверный старый пароль")
    
    # Хешируем и сохраняем новый
    from werkzeug.security import generate_password_hash
    manager.password_hash = generate_password_hash(data.new_password)
    await db.commit()
    
    return {"message": "Пароль успешно изменён"}

@router.put("/{manager_id}/viewed-bookings")
async def update_viewed_bookings(
    manager_id: int,
    db: AsyncSession = Depends(get_db)
):
    from datetime import datetime
    
    result = await db.execute(
        select(Manager).where(Manager.id == manager_id)
    )
    manager = result.scalar_one_or_none()
    if not manager:
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    
    manager.last_viewed_bookings = datetime.utcnow()
    await db.commit()
    return {"message": "OK"}