from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, desc
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_manager, get_current_admin
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
    status: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


# ========== ОТПРАВКА СООБЩЕНИЯ ==========

@router.post("")
@router.post("")
async def send_message(message: MessageCreate, db: AsyncSession = Depends(get_db)):
    """Отправить сообщение"""
    result = await db.execute(
        text("""
            INSERT INTO messages (sender_type, sender_id, receiver_type, receiver_id, type, title, body, related_booking_id, status)
            VALUES (:sender_type, :sender_id, :receiver_type, :receiver_id, :type, :title, :body, :related_booking_id, 'new')
            RETURNING id
        """),
        {
            "sender_type": message.sender_type,
            "sender_id": message.sender_id,
            "receiver_type": message.receiver_type,
            "receiver_id": message.receiver_id,
            "type": message.type,
            "title": message.title or "Сообщение в чат",
            "body": message.body or "",
            "related_booking_id": message.related_booking_id
        }
    )
    new_id = result.fetchone()[0]
    await db.commit()
    
    # WebSocket уведомление получателю
    try:
        from app.services.sync.websocket import ws_manager
        if message.receiver_type == 'admin':
            await ws_manager.broadcast_to_admins("new_chat_message")
        elif message.receiver_type == 'client':
            await ws_manager.send_update(message.receiver_id, "new_chat_message")        
        elif message.receiver_type == 'manager':
            await ws_manager.send_update(int(message.receiver_id), "new_chat_message")
    except Exception as e:
        print(f"⚠️ WebSocket error: {e}")
    
    # Telegram-уведомление менеджеру (если админ написал)
    if message.sender_type == 'admin' and message.receiver_type == 'manager':
        try:
            from app.services.telegram_service import telegram_service
            await telegram_service.notify_admin_message(
                manager_id=int(message.receiver_id),
                message=message.body,
                db=db
            )
        except Exception as e:
            print(f"⚠️ Telegram уведомление менеджеру не отправлено: {e}")

    
    # Push-уведомление получателю, если админ написал
    if message.sender_type == 'admin':
        try:
            from app.api.push_api import send_push_internal
            await send_push_internal(
                db=db,
                title="💬 Сообщение от поддержки",
                body=message.body[:100] if message.body else '',
                url="/chat",
                user_type=message.receiver_type,
                user_id=message.receiver_id
            )
        except Exception as e:
            print(f"⚠️ Ошибка push получателю: {e}")
    
    return {"success": True, "id": new_id}


# ========== ПОЛУЧЕНИЕ СООБЩЕНИЙ ==========

@router.get("")
async def get_messages(
    manager_id: Optional[int] = None,
    client_phone: Optional[str] = None,
    admin_id: Optional[int] = None,
    type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить сообщения для менеджера, клиента или админа"""
    query = "SELECT * FROM messages WHERE 1=1"
    params = {}
    
    if manager_id:
        query += " AND receiver_type = 'manager' AND receiver_id = :manager_id"
        params["manager_id"] = str(manager_id)
    elif client_phone:
        query += " AND (sender_id = :phone OR receiver_id = :phone)"
        params["phone"] = client_phone
    elif admin_id is not None:
        query += " AND (receiver_type = 'admin' OR sender_type = 'admin')"
    
    if type:
        query += " AND type = :type"
        params["type"] = type
    
    query += " ORDER BY created_at DESC LIMIT 100"
    
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
            "status": row[11] if len(row) > 11 else 'new',
            "created_at": str(row[10]) if row[10] else None
        })
    return messages


# ========== ДИАЛОГИ ДЛЯ АДМИНА ==========

@router.get("/admin/dialogs")
async def admin_get_dialogs(
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Список диалогов для админа (сгруппированы по sender_id)"""
    result = await db.execute(
        text("""
            SELECT DISTINCT ON (m.sender_id) 
                m.sender_id, m.sender_type, m.title, m.body, m.created_at, m.status,
                COALESCE(mgr.full_name, mgr.company_name) as sender_name
            FROM messages m
            LEFT JOIN managers mgr ON m.sender_type = 'manager' AND m.sender_id = mgr.id::text
            WHERE m.receiver_type = 'admin' OR m.sender_type = 'admin'
            ORDER BY m.sender_id, m.created_at DESC
        """)
    )
    dialogs = []
    for row in result.fetchall():
        dialogs.append({
            "sender_id": row[0],
            "sender_type": row[1],
            "sender_name": row[6] or None,
            "last_message": row[3][:100] if row[3] else "",
            "last_time": str(row[4]) if row[4] else None,
            "status": row[5] or "new"
        })
    return dialogs

# ========== УДАЛИТЬ ДИАЛОГ (ВСЕ СООБЩЕНИЯ С КЛИЕНТОМ) ==========
@router.delete("/dialog/{sender_id}")
async def delete_dialog(
    sender_id: str,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Полностью удалить все сообщения диалога с клиентом"""
    await db.execute(
        text("DELETE FROM messages WHERE sender_id = :sid OR receiver_id = :sid"),
        {"sid": sender_id}
    )
    await db.commit()
    return {"success": True}


# ========== ОТМЕТИТЬ ПРОЧИТАННЫМ ==========

@router.put("/{message_id}/read")
async def mark_read(message_id: int, db: AsyncSession = Depends(get_db)):
    """Отметить сообщение как прочитанное"""
    await db.execute(
        text("UPDATE messages SET is_read = true WHERE id = :id"),
        {"id": message_id}
    )
    await db.commit()
    return {"success": True}


# ========== СМЕНИТЬ СТАТУС ДИАЛОГА ==========

@router.put("/admin/dialog/{sender_id}/status")
async def update_dialog_status(
    sender_id: str,
    status: str = Query("replied"),
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Сменить статус диалога (new/replied/closed)"""
    await db.execute(
        text("UPDATE messages SET status = :status WHERE sender_id = :sid"),
        {"status": status, "sid": sender_id}
    )
    await db.commit()
    return {"success": True}


# ========== ОЧИСТКА ИСТОРИИ ==========

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