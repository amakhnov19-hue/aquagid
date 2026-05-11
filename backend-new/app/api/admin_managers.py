from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import Optional, List
from pydantic import BaseModel
from app.core.database import get_db
from app.models.manager_model import Manager
from app.core.security import get_current_admin

router = APIRouter(prefix="/admin/managers", tags=["admin"])

class ManagerStatusUpdate(BaseModel):
    status: str

class ManagerPrepaymentUpdate(BaseModel):
    prepayment_percent: int

@router.get("")
async def get_all_managers(
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)  # ← добавляем проверку токена
):
    print("DEBUG: get_all_managers called")
    print(f"DEBUG: admin = {admin}")
    
    """Получить всех менеджеров (только для админа)"""
    
    result = await db.execute(
        select(Manager).order_by(Manager.id)
    )
    managers = result.scalars().all()
    
    return [
        {
            "id": m.id,
            "name": m.full_name,
            "email": m.email,
            "phone": m.phone,
            "company": m.company_name,
            "status": m.status or "active",
            "created_at": m.created_at,
            "prepayment": m.prepayment_percent or 20
        }
        for m in managers
    ]

@router.put("/{manager_id}/status")
async def update_manager_status(
    manager_id: int,
    data: ManagerStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Изменить статус менеджера"""
    
    result = await db.execute(
        select(Manager).where(Manager.id == manager_id)
    )
    manager = result.scalar_one_or_none()
    
    if not manager:
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    
    manager.status = data.status
    await db.commit()
    
    return {"message": f"Статус изменён на {data.status}", "manager_id": manager_id}

@router.delete("/{manager_id}")
async def delete_manager(
    manager_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Удалить менеджера и все его катера (включая фото на диске)"""
    
    import os
    from app.models.boat_model import Boat, BoatPhoto
    
    # Получаем список фото для удаления с диска
    photos_result = await db.execute(
        text("""
            SELECT bp.photo_url FROM boat_photos bp
            JOIN boats b ON bp.boat_id = b.id
            WHERE b.manager_id = :mid
        """),
        {"mid": manager_id}
    )
    photo_urls = [row[0] for row in photos_result.fetchall()]
    
    # Удаляем фото катеров
    await db.execute(
        text("DELETE FROM boat_photos WHERE boat_id IN (SELECT id FROM boats WHERE manager_id = :mid)"),
        {"mid": manager_id}
    )
    
    # Удаляем катера
    await db.execute(
        text("DELETE FROM boats WHERE manager_id = :mid"),
        {"mid": manager_id}
    )
    
    # Удаляем менеджера
    result = await db.execute(
        text("DELETE FROM managers WHERE id = :mid RETURNING id"),
        {"mid": manager_id}
    )
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    
    await db.commit()
    
    # Удаляем файлы с диска
    upload_dir = "/var/www/aquagid-experimental/shared-uploads"
    for url in photo_urls:
        if url:
            filename = url.split('/')[-1]
            filepath = os.path.join(upload_dir, filename)
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
                    print(f"🗑 Фото удалено: {filepath}")
            except Exception as e:
                print(f"⚠️ Ошибка удаления фото {filepath}: {e}")
    
    return {"message": f"Менеджер {manager_id}, его катера и фото удалены", "photos_deleted": len(photo_urls)}

@router.put("/{manager_id}/prepayment")
async def update_manager_prepayment(
    manager_id: int,
    data: ManagerPrepaymentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Изменить процент предоплаты для менеджера"""
    
    result = await db.execute(
        select(Manager).where(Manager.id == manager_id)
    )
    manager = result.scalar_one_or_none()
    
    if not manager:
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    
    manager.prepayment_percent = data.prepayment_percent
    await db.commit()
    
    return {"message": "Предоплата обновлена", "prepayment": data.prepayment_percent}

from app.models.admin_model import Admin
import bcrypt

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    token: str
    admin_id: int

@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(
    request: AdminLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # Ищем админа
    result = await db.execute(
        select(Admin).where(Admin.username == request.username)
    )
    admin = result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    
    # Проверяем пароль (сравниваем в открытом виде, пока без хеша)
    if request.password != admin.password_hash:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    
    # Создаём JWT токен
    from app.core.security import create_access_token
    token = create_access_token({"sub": str(admin.id), "role": "admin"})
    
    return AdminLoginResponse(token=token, admin_id=admin.id)