from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
import subprocess
import os

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/diagnostics")
async def diagnostics(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except:
        db_ok = False

    backend = "✅ Работает"
    database = "✅ Подключена" if db_ok else "❌ Ошибка подключения"

    try:
        result = subprocess.run(["/usr/bin/pgrep", "-f", "uvicorn.*8082"], capture_output=True)
        uvicorn = "✅ Запущен" if result.returncode == 0 else "❌ Не найден"
    except:
        uvicorn = "❌ Не найден"

    logs_text = "Нет логов"
    try:
        if os.path.exists("/var/log/aquagid-backend.log"):
            with open("/var/log/aquagid-backend.log", "r") as f:
                lines = f.readlines()
                last_lines = lines[-30:] if len(lines) >= 30 else lines
                logs_text = "".join(last_lines)
    except:
        pass

    errors_text = "Нет ошибок"
    try:
        if os.path.exists("/var/log/aquagid-backend-error.log"):
            with open("/var/log/aquagid-backend-error.log", "r") as f:
                lines = f.readlines()
                last_lines = lines[-30:] if len(lines) >= 30 else lines
                errors_text = "".join(last_lines)
    except:
        pass

    return {
        "success": True,
        "backend": backend,
        "database": database,
        "uvicorn": uvicorn,
        "logs": logs_text[-2000:],
        "errors": errors_text[-2000:]
    }


@router.post("/restart-backend")
async def restart_backend():
    try:
        subprocess.run(["sudo", "systemctl", "restart", "aquagid-backend"], capture_output=True)
        return {"success": True, "message": "Бэкенд перезапущен"}
    except:
        return {"success": False, "message": "Ошибка перезапуска"}
