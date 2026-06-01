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