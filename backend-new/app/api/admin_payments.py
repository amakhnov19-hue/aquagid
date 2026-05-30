from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.security import get_current_admin

router = APIRouter(tags=["admin-payments"])


@router.get("/payment-accounts")
async def get_payment_accounts(
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Список всех платёжных аккаунтов"""
    result = await db.execute(
        text("SELECT id, name, bank, merchant_id, test_mode, is_active, created_at FROM payment_accounts ORDER BY id")
    )
    accounts = []
    for row in result.fetchall():
        accounts.append({
            "id": row[0],
            "name": row[1],
            "bank": row[2],
            "merchant_id": row[3],
            "test_mode": row[4],
            "is_active": row[5],
            "created_at": str(row[6]) if row[6] else None
        })
    return {"accounts": accounts}


@router.post("/payment-accounts")
async def create_payment_account(
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Создать новый платёжный аккаунт"""
    result = await db.execute(
        text("""
            INSERT INTO payment_accounts (name, bank, merchant_id, secret_key, test_mode, is_active)
            VALUES (:name, :bank, :merchant_id, :secret_key, :test_mode, :is_active)
            RETURNING id
        """),
        {
            "name": data.get("name"),
            "bank": data.get("bank", "modulbank"),
            "merchant_id": data.get("merchant_id"),
            "secret_key": data.get("secret_key"),
            "test_mode": data.get("test_mode", True),
            "is_active": data.get("is_active", True)
        }
    )
    await db.commit()
    return {"success": True, "id": result.fetchone()[0]}


@router.put("/payment-accounts/{account_id}")
async def update_payment_account(
    account_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Обновить платёжный аккаунт"""
    await db.execute(
        text("""
            UPDATE payment_accounts 
            SET name = :name, bank = :bank, merchant_id = :merchant_id, 
                secret_key = COALESCE(NULLIF(:secret_key, ''), secret_key),
                test_mode = :test_mode, is_active = :is_active, updated_at = NOW()
            WHERE id = :id
        """),
        {
            "id": account_id,
            "name": data.get("name"),
            "bank": data.get("bank", "modulbank"),
            "merchant_id": data.get("merchant_id"),
            "secret_key": data.get("secret_key", ""),
            "test_mode": data.get("test_mode", True),
            "is_active": data.get("is_active", True)
        }
    )
    await db.commit()
    return {"success": True}


@router.delete("/payment-accounts/{account_id}")
async def delete_payment_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Удалить платёжный аккаунт"""
    # Проверяем, не привязан ли к менеджерам
    result = await db.execute(
        text("SELECT COUNT(*) FROM managers WHERE payment_account_id = :id"),
        {"id": account_id}
    )
    if result.fetchone()[0] > 0:
        raise HTTPException(status_code=400, detail="Аккаунт привязан к менеджерам")
    
    await db.execute(text("DELETE FROM payment_accounts WHERE id = :id"), {"id": account_id})
    await db.commit()
    return {"success": True}

@router.put("/managers/{manager_id}/payment-account")
async def set_manager_payment_account(
    manager_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Привязать менеджера к платёжному аккаунту (или отвязать)"""
    payment_account_id = data.get("payment_account_id")  # None = отвязать
    
    await db.execute(
        text("UPDATE managers SET payment_account_id = :pid WHERE id = :mid"),
        {"pid": payment_account_id, "mid": manager_id}
    )
    await db.commit()
    return {"success": True}