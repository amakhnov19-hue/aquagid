from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, desc
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_manager
from app.models.message_model import Message

router = APIRouter(tags=["messages"])

class MessageCreate(BaseModel):
    sender_type: str
    sender_id: str
    receiver_type: str
    receiver_id: str
    type: str = "chat"
    title: Optional[str] = None
    body: Optional[str] = None
    related_booking_id: Optional[int] = None

class MessageResponse(BaseModel):
    id: int
    sender_type: str
    sender_id: str
    receiver_type: str
    receiver_id: str
    type: str
    title: Optional[str]
    body: Optional[str]
    related_booking_id: Optional[int]
    is_read: bool
    created_at: str

    class Config:
        from_attributes = True

@router.post("")
async def send_message(message: MessageCreate, db: AsyncSession = Depends(get_db)):
    """Отправить сообщение"""
    db_message = Message(**message.dict())
    db.add(db_message)
    await db.commit()
    await db.refresh(db_message)
    return {"success": True, "id": db_message.id}

@router.get("")
async def get_messages(
    manager_id: Optional[int] = None,
    client_phone: Optional[str] = None,
    type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить сообщения для менеджера или клиента"""
    query = "SELECT * FROM messages WHERE 1=1"
    params = {}
    
    if manager_id:
        query += " AND receiver_type = 'manager' AND receiver_id = :manager_id"
        params["manager_id"] = str(manager_id)
    elif client_phone:
        query += " AND (sender_id = :phone OR receiver_id = :phone)"
        params["phone"] = client_phone
    
    if type:
        query += " AND type = :type"
        params["type"] = type
    
    query += " ORDER BY created_at DESC LIMIT 50"
    
    result = await db.execute(text(query), params)
    messages = []
    for row in result.fetchall():
        messages.append({
            "id": row[0],
            "sender_type": row[1],
            "sender_id": row[2],
            "receiver_type": row[3],
            "receiver_id": row[4],
            "type": row[5],
            "title": row[6],
            "body": row[7],
            "related_booking_id": row[8],
            "is_read": row[9],
            "created_at": str(row[10]) if row[10] else None
        })
    return messages

@router.put("/{message_id}/read")
async def mark_read(message_id: int, db: AsyncSession = Depends(get_db)):
    """Отметить сообщение как прочитанное"""
    await db.execute(
        text("UPDATE messages SET is_read = true WHERE id = :id"),
        {"id": message_id}
    )
    await db.commit()
    return {"success": True}

@router.delete("/history")
async def clear_history(
    manager_id: Optional[int] = None,
    client_phone: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Удалить все прочитанные уведомления менеджера или клиента"""
    if manager_id:
        result = await db.execute(
            text("DELETE FROM messages WHERE receiver_type = 'manager' AND receiver_id = :id AND is_read = true"),
            {"id": str(manager_id)}
        )
    elif client_phone:
        result = await db.execute(
            text("DELETE FROM messages WHERE (sender_id = :phone OR receiver_id = :phone) AND is_read = true"),
            {"phone": client_phone}
        )
    else:
        raise HTTPException(status_code=400, detail="Нужен manager_id или client_phone")
    await db.commit()
    return {"success": True, "deleted": result.rowcount}
