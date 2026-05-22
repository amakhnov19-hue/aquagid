"""
API для документов (оферта, правила, согласия)
"""
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.security import get_current_manager, get_current_admin

router = APIRouter(prefix="/documents", tags=["documents"])


def txt_to_html(txt: str) -> str:
    """Конвертирует .txt в HTML: абзацы → <p>, переносы → <br>"""
    # Экранируем HTML
    txt = txt.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Двойной перенос → новый абзац
    txt = re.sub(r'\n\s*\n', '</p><p>', txt)
    # Одинарный перенос → <br>
    txt = txt.replace('\n', '<br>')
    return f'<p>{txt}</p>'

def docx_to_html(file_bytes: bytes) -> str:
    """Конвертирует .docx в HTML"""
    from io import BytesIO
    from docx import Document
    
    doc = Document(BytesIO(file_bytes))
    html_parts = []
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            html_parts.append('<br>')
            continue
        
        # Определяем стиль
        if para.style.name.startswith('Heading'):
            level = para.style.name.split()[-1]
            html_parts.append(f'<h{level}>{text}</h{level}>')
        elif para.style.name == 'List Bullet':
            html_parts.append(f'<li>{text}</li>')
        elif para.style.name == 'List Number':
            html_parts.append(f'<li>{text}</li>')
        else:
            html_parts.append(f'<p>{text}</p>')
    
    return '\n'.join(html_parts)

import base64

def decode_content(content: str) -> str:
    """Если контент в base64 (docx) — декодируем и конвертируем"""
    if not content:
        return content
    if content.startswith('PK'):
        return docx_to_html(content.encode('latin-1'))
    try:
        # Пробуем base64
        decoded = base64.b64decode(content)
        if decoded[:2] == b'PK':
            return docx_to_html(decoded)
    except:
        pass
    if not re.search(r'<[^>]+>', content):
        return txt_to_html(content)
    return content


# ========== ПУБЛИЧНЫЕ ==========

@router.get("")
async def get_documents(
    target: str = Query(None, description="client или manager"),
    db: AsyncSession = Depends(get_db)
):
    """Получить документы (публичный)"""
    conditions = []
    params = {}
    
    if target == "client":
        conditions.append("show_in_client = true")
    elif target == "manager":
        conditions.append("show_in_manager = true")
    
    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    
    result = await db.execute(
        text(f"SELECT id, key, title, content, version, updated_at FROM documents {where} ORDER BY sort_order")
    )
    docs = []
    for row in result.fetchall():
        docs.append({
            "id": row[0],
            "key": row[1],
            "title": row[2],
            "content": row[3],
            "version": row[4],
            "updated_at": str(row[5]) if row[5] else None
        })
    return {"documents": docs}


# ========== АДМИН ==========

@router.get("/admin/all")
async def admin_get_documents(
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Получить все документы (админ)"""
    result = await db.execute(
        text("SELECT id, key, title, content, show_in_client, show_in_manager, sort_order, version, updated_at FROM documents ORDER BY sort_order")
    )
    docs = []
    for row in result.fetchall():
        docs.append({
            "id": row[0],
            "key": row[1],
            "title": row[2],
            "content": row[3],
            "show_in_client": row[4],
            "show_in_manager": row[5],
            "sort_order": row[6],
            "version": row[7],
            "updated_at": str(row[8]) if row[8] else None
        })
    return {"documents": docs}


@router.post("/admin")
async def admin_create_document(
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Создать документ (админ). Поля: key, title, content, show_in_client, show_in_manager, sort_order"""
    # Конвертируем .txt → HTML если контент не содержит HTML-тегов
    content = data.get("content", "")
    if content:
        content = decode_content(content)
    
    result = await db.execute(
        text("""
            INSERT INTO documents (key, title, content, show_in_client, show_in_manager, sort_order)
            VALUES (:key, :title, :content, :show_in_client, :show_in_manager, :sort_order)
            RETURNING id
        """),
        {
            "key": data.get("key", ""),
            "title": data.get("title", ""),
            "content": content,
            "show_in_client": data.get("show_in_client", False),
            "show_in_manager": data.get("show_in_manager", False),
            "sort_order": data.get("sort_order", 0)
        }
    )
    await db.commit()
    return {"success": True, "id": result.fetchone()[0]}


@router.put("/admin/{doc_id}")
async def admin_update_document(
    doc_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Обновить документ (админ)"""
    content = data.get("content", "")
    if content:
        content = decode_content(content)
    
    await db.execute(
        text("""
            UPDATE documents SET
                title = COALESCE(:title, title),
                content = COALESCE(:content, content),
                show_in_client = COALESCE(:show_in_client, show_in_client),
                show_in_manager = COALESCE(:show_in_manager, show_in_manager),
                sort_order = COALESCE(:sort_order, sort_order),
                updated_at = NOW()
            WHERE id = :id
        """),
        {
            "id": doc_id,
            "title": data.get("title"),
            "content": content or None,
            "show_in_client": data.get("show_in_client"),
            "show_in_manager": data.get("show_in_manager"),
            "sort_order": data.get("sort_order")
        }
    )
    await db.commit()
    return {"success": True}


@router.delete("/admin/{doc_id}")
async def admin_delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Удалить документ (админ)"""
    await db.execute(text("DELETE FROM documents WHERE id = :id"), {"id": doc_id})
    await db.commit()
    return {"success": True}

