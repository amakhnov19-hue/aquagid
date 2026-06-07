"""
Push-уведомления через Web Push API (PWA)
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
import json

router = APIRouter(tags=["push"])


@router.post("/subscribe")
async def push_subscribe(
    data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Сохранить push-подписку"""
    subscription = data.get("subscription")
    user_type = data.get("user_type", "client")  # client / manager / admin
    user_id = data.get("user_id", "")
    
    endpoint = subscription.get("endpoint")
    keys = json.dumps(subscription.get("keys", {}))
    
    await db.execute(
        text("""
            INSERT INTO push_subscriptions (endpoint, keys, user_type, user_id)
            VALUES (:endpoint, :keys, :user_type, :user_id)
            ON CONFLICT (endpoint) DO NOTHING
        """),
        {
            "endpoint": endpoint,
            "keys": keys,
            "user_type": user_type,
            "user_id": user_id
        }
    )
    await db.commit()
    
    return {"success": True}

import os
from pywebpush import webpush, WebPushException

async def send_push_internal(db, title, body, url, user_type, user_id):
    """Внутренняя функция для отправки push из других модулей"""
    # Сохраняем в историю
    await db.execute(
        text("INSERT INTO push_notifications (user_type, user_id, title, body, url) VALUES (:ut, :uid, :title, :body, :url)"),
        {"ut": user_type, "uid": user_id, "title": title, "body": body, "url": url}
    )
    await db.commit()

    # WebSocket уведомление менеджеру
    try:
        from app.services.sync.websocket import ws_manager
        await ws_manager.send_update(int(user_id), "bookings_updated")
    except:
        pass
    
    # Отправляем push подписчикам
    result = await db.execute(
        text("SELECT endpoint, keys FROM push_subscriptions WHERE user_type = :ut AND user_id = :uid"),
        {"ut": user_type, "uid": user_id}
    )
    for row in result.fetchall():
        try:
            webpush(
                subscription_info={"endpoint": row[0], "keys": json.loads(row[1])},
                data=json.dumps({"title": title, "body": body, "url": url}),
                vapid_private_key=os.getenv("VAPID_PRIVATE_KEY"),
                vapid_claims={"sub": "mailto:support@24aquabooking.ru"}
            )
        except Exception as e:
            print(f"❌ Push error: {e}")


@router.post("/send")
async def send_push(
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Отправить push-уведомление"""
    title = data.get("title", "АкваГид")
    body = data.get("body", "")
    url = data.get("url", "/")
    user_type = data.get("user_type")
    user_id = data.get("user_id")
    
    # 1. Сохраняем в историю ВСЕГДА (даже если нет push-подписок)
    await db.execute(
        text("""
            INSERT INTO push_notifications (user_type, user_id, title, body, url)
            VALUES (:ut, :uid, :title, :body, :url)
        """),
        {"ut": user_type, "uid": user_id, "title": title, "body": body, "url": url}
    )
    await db.commit()
    
    # 2. Ищем push-подписки
    query = "SELECT endpoint, keys FROM push_subscriptions WHERE 1=1"
    params = {}
    if user_type:
        query += " AND user_type = :user_type"
        params["user_type"] = user_type
    if user_id:
        query += " AND user_id = :user_id"
        params["user_id"] = user_id
    
    result = await db.execute(text(query), params)
    subscriptions = [{"endpoint": row[0], "keys": json.loads(row[1])} for row in result.fetchall()]
    
    # 3. Отправляем push
    sent = 0
    for sub in subscriptions:
        try:
            webpush(
                subscription_info=sub,
                data=json.dumps({"title": title, "body": body, "url": url}),
                vapid_private_key=os.getenv("VAPID_PRIVATE_KEY"),
                vapid_claims={"sub": "mailto:support@24aquabooking.ru"}
            )
            sent += 1
        except WebPushException as e:
            print(f"❌ Push failed: {e}")
            if e.response and e.response.status_code == 410:
                await db.execute(text("DELETE FROM push_subscriptions WHERE endpoint = :ep"), {"ep": sub["endpoint"]})
                await db.commit()
    
    return {"success": True, "sent": sent, "total": len(subscriptions)}

@router.get("/notifications")
async def get_notifications(
    user_type: str,
    user_id: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Получить историю уведомлений"""
    result = await db.execute(
        text("""
            SELECT id, title, body, url, is_read, created_at 
            FROM push_notifications 
            WHERE user_type = :ut AND user_id = :uid
            ORDER BY created_at DESC 
            LIMIT :limit
        """),
        {"ut": user_type, "uid": user_id, "limit": limit}
    )
    notifications = [
        {
            "id": row[0],
            "title": row[1],
            "body": row[2],
            "url": row[3],
            "is_read": row[4],
            "created_at": str(row[5])
        }
        for row in result.fetchall()
    ]
    return {"notifications": notifications}


@router.get("/notifications/count")
async def get_unread_count(
    user_type: str,
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Количество непрочитанных уведомлений"""
    result = await db.execute(
        text("""
            SELECT COUNT(*) FROM push_notifications 
            WHERE user_type = :ut AND user_id = :uid AND is_read = false
        """),
        {"ut": user_type, "uid": user_id}
    )
    return {"count": result.scalar()}


@router.put("/notifications/{notif_id}/read")
async def mark_read(notif_id: int, db: AsyncSession = Depends(get_db)):
    """Отметить уведомление как прочитанное"""
    await db.execute(
        text("UPDATE push_notifications SET is_read = true WHERE id = :id"),
        {"id": notif_id}
    )
    await db.commit()
    return {"success": True}

@router.put("/notifications/read-all")
async def mark_all_read(
    user_type: str,
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Отметить все уведомления прочитанными"""
    await db.execute(
        text("UPDATE push_notifications SET is_read = true WHERE user_type = :ut AND user_id = :uid AND is_read = false"),
        {"ut": user_type, "uid": user_id}
    )
    await db.commit()
    return {"success": True}

@router.delete("/notifications/clear")
async def clear_notifications(
    user_type: str,
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Удалить все уведомления пользователя"""
    await db.execute(
        text("DELETE FROM push_notifications WHERE user_type = :ut AND user_id = :uid"),
        {"ut": user_type, "uid": user_id}
    )
    await db.commit()
    return {"success": True}

