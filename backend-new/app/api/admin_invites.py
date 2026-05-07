from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime, timedelta
import secrets
from app.core.database import get_db
from sqlalchemy import text
from sqlalchemy import select
from app.core.security import get_password_hash  # ← ЗАМЕНЯЕМ bcrypt

router = APIRouter(prefix="/admin", tags=["admin"])

class InviteRequest(BaseModel):
    phone: str

class InviteResponse(BaseModel):
    invite_url: str
    expires_at: datetime

@router.post("/manager-invite", response_model=InviteResponse)
async def create_manager_invite(
    request: InviteRequest,
    db: AsyncSession = Depends(get_db)
):
    """Создать приглашение для менеджера (только для админа)"""
    
    # Генерируем уникальный токен
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(days=7)
    
    # Сохраняем в БД
    query = text("""
        INSERT INTO manager_invites (phone, token, expires_at)
        VALUES (:phone, :token, :expires_at)
        ON CONFLICT (phone) DO UPDATE
        SET token = :token, expires_at = :expires_at, used = FALSE
    """)
    
    await db.execute(query, {
        "phone": request.phone,
        "token": token,
        "expires_at": expires_at
    })
    await db.commit()
    
    invite_url = f"https://manager.experimental.24aquabooking.ru/register/{token}"
    
    return InviteResponse(
        invite_url=invite_url,
        expires_at=expires_at
    )

@router.get("/auth/check-invite/{token}")
async def check_invite(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Проверить действительность токена приглашения"""
    
    query = text("""
        SELECT phone, expires_at, used
        FROM manager_invites
        WHERE token = :token
    """)
    
    result = await db.execute(query, {"token": token})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Приглашение не найдено")
    
    phone, expires_at, used = row
    
    if used:
        raise HTTPException(status_code=400, detail="Приглашение уже использовано")
    
    if expires_at < datetime.now():
        raise HTTPException(status_code=400, detail="Срок действия приглашения истёк")
    
    return {"phone": phone, "valid": True}

class ManagerRegisterRequest(BaseModel):
    token: str
    full_name: str
    password: str
    phone: str

class ManagerRegisterResponse(BaseModel):
    manager_id: int
    message: str

@router.post("/register-manager", response_model=ManagerRegisterResponse)
async def register_manager(
    request: ManagerRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Завершить регистрацию менеджера по токену"""
    
    # Проверяем токен
    query = text("""
        SELECT phone, expires_at, used
        FROM manager_invites
        WHERE token = :token
    """)
    
    result = await db.execute(query, {"token": request.token})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Приглашение не найдено")
    
    invite_phone, expires_at, used = row
    
    if used:
        raise HTTPException(status_code=400, detail="Приглашение уже использовано")
    
    if expires_at < datetime.now():
        raise HTTPException(status_code=400, detail="Срок действия приглашения истёк")
    
    # Проверяем, что телефон совпадает
    if invite_phone != request.phone:
        raise HTTPException(status_code=400, detail="Телефон не совпадает с приглашением")
    
    # Хешируем пароль через security.py (scrypt)
    hashed_password = get_password_hash(request.password)
    
    insert_query = text("""
        INSERT INTO managers (full_name, phone, password_hash, is_active, status)
        VALUES (:full_name, :phone, :password_hash, true, 'active')
        RETURNING id
    """)
    
    result = await db.execute(insert_query, {
        "full_name": request.full_name,
        "phone": request.phone,
        "password_hash": hashed_password
    })
    manager_id = result.fetchone()[0]
    
    # Помечаем приглашение как использованное
    await db.execute(
        text("UPDATE manager_invites SET used = TRUE WHERE token = :token"),
        {"token": request.token}
    )
    
    await db.commit()
    
    return ManagerRegisterResponse(
        manager_id=manager_id,
        message="Менеджер успешно зарегистрирован"
    )

class ManagerProfileUpdate(BaseModel):
    company_name: str
    phone: str
    email: str

@router.put("/managers/{manager_id}/profile")
async def update_manager_profile(
    manager_id: int,
    profile: ManagerProfileUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Обновить профиль менеджера после регистрации"""
    
    query = text("""
        UPDATE managers
        SET company_name = :company_name,
            phone = :phone,
            email = :email
        WHERE id = :manager_id
        RETURNING id
    """)
    
    result = await db.execute(query, {
        "company_name": profile.company_name,
        "phone": profile.phone,
        "email": profile.email,
        "manager_id": manager_id
    })
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    
    await db.commit()
    
    return {"message": "Профиль обновлён", "manager_id": manager_id}