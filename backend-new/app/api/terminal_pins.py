from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from app.core.database import get_db
import secrets

router = APIRouter(prefix="/admin/terminal-pins", tags=["terminal"])

class PinCreate(BaseModel):
    description: str = ""

@router.post("")
async def create_pin(data: PinCreate, db: AsyncSession = Depends(get_db)):
    """Создать новый пин-код для доступа"""
    pin = secrets.token_hex(3)[:6]  # 6 символов
    
    await db.execute(
        text("INSERT INTO terminal_pins (pin_code, description) VALUES (:pin, :desc)"),
        {"pin": pin, "desc": data.description}
    )
    await db.commit()
    
    return {"pin_code": pin, "description": data.description}

@router.get("")
async def list_pins(db: AsyncSession = Depends(get_db)):
    """Список активных пинов"""
    result = await db.execute(
        text("SELECT id, pin_code, allowed_ip, description, created_at FROM terminal_pins WHERE is_active = TRUE ORDER BY created_at DESC")
    )
    pins = []
    for row in result.fetchall():
        pins.append({
            "id": row[0],
            "pin_code": row[1],
            "allowed_ip": row[2],
            "description": row[3],
            "created_at": str(row[4])
        })
    return pins

@router.delete("/{pin_id}")
async def revoke_pin(pin_id: int, db: AsyncSession = Depends(get_db)):
    """Отозвать пин-код"""
    await db.execute(
        text("UPDATE terminal_pins SET is_active = FALSE WHERE id = :id"),
        {"id": pin_id}
    )
    await db.commit()
    return {"success": True}

@router.get("/check/{pin_code}")
async def check_pin(pin_code: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Проверить пин-код (для подчинённого терминала)"""
    result = await db.execute(
        text("SELECT id, allowed_ip FROM terminal_pins WHERE pin_code = :pin AND is_active = TRUE"),
        {"pin": pin_code}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=403, detail="Неверный или отозванный пин")
    
    client_ip = request.client.host
    
    # При первом входе привязываем IP
    if not row[1]:
        await db.execute(
            text("UPDATE terminal_pins SET allowed_ip = :ip WHERE id = :id"),
            {"ip": client_ip, "id": row[0]}
        )
        await db.commit()
        return {"success": True, "message": "Доступ активирован"}
    
    # Проверяем IP
    if row[1] != client_ip:
        raise HTTPException(status_code=403, detail="IP не совпадает")
    
    return {"success": True}

