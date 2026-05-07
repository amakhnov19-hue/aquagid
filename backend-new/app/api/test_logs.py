from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db

router = APIRouter(prefix="/test-logs", tags=["test-logs"])

class TestLogCreate(BaseModel):
    tester_name: str
    action_type: str
    description: str
    status: str = "ok"
    related_booking_id: Optional[int] = None
    related_boat_id: Optional[int] = None

@router.post("")
async def create_log(log: TestLogCreate, db: AsyncSession = Depends(get_db)):
    await db.execute(
        text("""
            INSERT INTO test_logs (tester_name, action_type, description, status, related_booking_id, related_boat_id)
            VALUES (:tester, :action, :desc, :status, :booking, :boat)
        """),
        {"tester": log.tester_name, "action": log.action_type, "desc": log.description,
         "status": log.status, "booking": log.related_booking_id, "boat": log.related_boat_id}
    )
    await db.commit()
    return {"success": True}

@router.get("")
async def get_logs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT * FROM test_logs ORDER BY created_at DESC LIMIT 200"))
    logs = []
    for row in result.fetchall():
        logs.append({
            "id": row[0], "tester_name": row[1], "action_type": row[2],
            "description": row[3], "status": row[4],
            "related_booking_id": row[5], "related_boat_id": row[6],
            "created_at": str(row[7])
        })
    
    stats_result = await db.execute(text("""
        SELECT status, COUNT(*) FROM test_logs GROUP BY status
    """))
    stats = {row[0]: row[1] for row in stats_result.fetchall()}
    
    return {"logs": logs, "total": len(logs), "stats": stats}

@router.get("/daily-report")
async def daily_report(db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timedelta, date
    yesterday = date.today() - timedelta(days=1)
    
    total_bookings = await db.execute(text("SELECT COUNT(*) FROM bookings WHERE created_at >= :d"), {"d": yesterday})
    active_now = await db.execute(text("SELECT COUNT(*) FROM bookings WHERE status = 'active'"))
    completed = await db.execute(text("SELECT COUNT(*) FROM bookings_archive WHERE created_at >= :d"), {"d": yesterday})
    
    total_logs = await db.execute(text("SELECT COUNT(*) FROM test_logs WHERE created_at >= :d"), {"d": yesterday})
    ok_logs = await db.execute(text("SELECT COUNT(*) FROM test_logs WHERE created_at >= :d AND status = 'ok'"), {"d": yesterday})
    error_logs = await db.execute(text("SELECT COUNT(*) FROM test_logs WHERE created_at >= :d AND status = 'error'"), {"d": yesterday})
    
    active_boats = await db.execute(text("SELECT COUNT(*) FROM boats WHERE is_active = true AND deleted_at IS NULL"))
    total_boats = await db.execute(text("SELECT COUNT(*) FROM boats WHERE deleted_at IS NULL"))
    
    errors = await db.execute(text("SELECT description, tester_name FROM test_logs WHERE created_at >= :d AND status = 'error' ORDER BY created_at DESC LIMIT 10"), {"d": yesterday})
    error_list = [{"tester": row[1], "description": row[0]} for row in errors.fetchall()]
    
    return {
        "date": yesterday,
        "boats": {"total": total_boats.scalar(), "active": active_boats.scalar()},
        "bookings": {"total": total_bookings.scalar(), "active_now": active_now.scalar(), "completed": completed.scalar()},
        "test_logs": {"total": total_logs.scalar(), "ok": ok_logs.scalar(), "error": error_logs.scalar()},
        "errors": error_list
    }

@router.post("/mark-viewed")
async def mark_viewed(db: AsyncSession = Depends(get_db)):
    await db.execute(text("UPDATE test_logs SET status = 'viewed' WHERE status = 'ok' OR status = 'error'"))
    await db.commit()
    return {"success": True}

@router.delete("/history")
async def delete_history(db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM test_logs WHERE status = 'viewed'"))
    await db.commit()
    return {"success": True}

