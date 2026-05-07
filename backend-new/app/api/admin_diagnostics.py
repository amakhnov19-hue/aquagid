from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
import subprocess

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/diagnostics")
async def diagnostics(db: AsyncSession = Depends(get_db)):
    """Диагностика системы"""
    
    # Проверка БД
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        db_ok = False
        db_error = str(e)
    
    # Проверка Uvicorn
    result = subprocess.run(["pgrep", "-f", "uvicorn.*8082"], capture_output=True)
    uvicorn_running = result.returncode == 0
    
    # Последние логи (если есть)
    try:
        logs = subprocess.run(
            ["tail", "-30", "/var/www/aquagid-experimental/backend-new/nohup.out"],
            capture_output=True, text=True
        ).stdout
    except:
        logs = "Логи недоступны (файл не найден)"
    
    return {
        "success": True,
        "backend": "✅ Работает",
        "database": "✅ Подключена" if db_ok else f"❌ Ошибка: {db_error if not db_ok else ''}",
        "uvicorn": "✅ Запущен" if uvicorn_running else "❌ Остановлен",
        "logs": logs[-2000:] if logs else "Нет логов"
    }


@router.post("/diagnostics/restart-backend")
async def restart_backend():
    """Перезапуск бэкенда"""
    import os
    
    # Убиваем старый процесс
    subprocess.run(["pkill", "-f", "uvicorn.*8082"], capture_output=True)
    
    # Запускаем новый
    cmd = "cd /var/www/aquagid-experimental/backend-new && source venv/bin/activate && export PYTHONPATH=/var/www/aquagid-experimental/backend-new && nohup python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8082 > /dev/null 2>&1 &"
    subprocess.Popen(cmd, shell=True, executable="/bin/bash")
    
    return {"success": True, "message": "✅ Бэкенд перезапущен"}
