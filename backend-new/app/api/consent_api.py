"""
API для управления согласиями (GDPR/152-ФЗ)
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db

router = APIRouter(tags=["consent"])

class ConsentRequest(BaseModel):
    user_type: str
    user_id: str
    consent_type: str  # pd, terms, geo
    doc_version: Optional[str] = None
    client_name: Optional[str] = None 

@router.post("/give")
async def give_consent(data: ConsentRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Сохранить согласие"""
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    ua = request.headers.get("user-agent", "")
    
    # Получаем актуальную версию документа
    doc = await db.execute(
        text("SELECT version, content_hash FROM document_versions WHERE document_key = :key ORDER BY active_from DESC LIMIT 1"),
        {"key": f"consent_{data.consent_type}"}
    )
    doc_row = doc.fetchone()
    version = data.doc_version or (doc_row[0] if doc_row else "unknown")
    doc_hash = doc_row[1] if doc_row else None
    
    await db.execute(
        text("""
            INSERT INTO user_consents (user_type, user_id, action, consent_type, doc_version, doc_hash, ip_address, user_agent, client_name)
            VALUES (:ut, :uid, 'accepted', :ct, :ver, :hash, :ip, :ua, :name)
        """),
        {
            "ut": data.user_type,
            "uid": data.user_id,
            "ct": data.consent_type,
            "ver": version,
            "hash": doc_hash,
            "ip": ip,
            "ua": ua,
            "name": data.client_name      # ← добавь эту строку
        }
    )
    await db.commit()
    return {"success": True, "version": version}

@router.post("/revoke")
async def revoke_consent(data: ConsentRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Отозвать согласие"""
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    ua = request.headers.get("user-agent", "")
    
    await db.execute(
        text("""
            INSERT INTO user_consents (user_type, user_id, action, consent_type, ip_address, user_agent)
            VALUES (:ut, :uid, 'revoked', :ct, :ip, :ua)
        """),
        {
            "ut": data.user_type,
            "uid": data.user_id,
            "ct": data.consent_type,
            "ip": ip,
            "ua": ua
        }
    )
    await db.commit()
    return {"success": True}

@router.get("/history/{user_type}/{user_id}")
async def get_consent_history(user_type: str, user_id: str, db: AsyncSession = Depends(get_db)):
    """История согласий пользователя"""
    result = await db.execute(
        text("""
            SELECT action, consent_type, doc_version, ip_address, created_at
            FROM user_consents
            WHERE user_type = :ut AND user_id = :uid
            ORDER BY created_at DESC
            LIMIT 50
        """),
        {"ut": user_type, "uid": user_id}
    )
    history = [
        {
            "action": row[0],
            "consent_type": row[1],
            "doc_version": row[2],
            "ip_address": row[3],
            "created_at": str(row[4])
        }
        for row in result.fetchall()
    ]
    return {"history": history}