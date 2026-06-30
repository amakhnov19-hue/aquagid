from fastapi import APIRouter
import subprocess
import shutil
import os

router = APIRouter(prefix="/admin", tags=["admin"])


def check_disk():
    """Проверка места на диске"""
    try:
        usage = shutil.disk_usage("/")
        free_percent = (usage.free / usage.total) * 100
        return {
            "ok": free_percent > 10,
            "message": f"Свободно {free_percent:.0f}% ({usage.free // (1024**3)} ГБ из {usage.total // (1024**3)} ГБ)"
        }
    except:
        return {"ok": False, "message": "Ошибка проверки диска"}


def check_memory():
    """Проверка памяти"""
    try:
        result = subprocess.run(["free", "-m"], capture_output=True, text=True)
        lines = result.stdout.split("\n")
        mem_line = [l for l in lines if "Mem:" in l][0].split()
        total = int(mem_line[1])
        used = int(mem_line[2])
        used_percent = (used / total) * 100
        return {
            "ok": used_percent < 90,
            "message": f"Использовано {used_percent:.0f}% ({used} МБ из {total} МБ)"
        }
    except:
        return {"ok": False, "message": "Ошибка проверки памяти"}


def check_port(port):
    """Проверка что порт слушается"""
    try:
        result = subprocess.run(["ss", "-tlnp"], capture_output=True, text=True)
        return str(port) in result.stdout
    except:
        return False


@router.get("/diagnostics")
async def diagnostics():
    disk = check_disk()
    memory = check_memory()
    backend = check_port(8084)
    beta = check_port(8083)
    
    return {
        "status": "ok" if all([disk["ok"], memory["ok"], backend]) else "error",
        "checks": [
            {"name": "Бэкенд (порт 8084)", "ok": backend, "message": "Работает" if backend else "❌ Не отвечает"},
            {"name": "Бета (порт 8083)", "ok": beta, "message": "Работает" if beta else "❌ Не отвечает"},
            {"name": "Диск", "ok": disk["ok"], "message": disk["message"]},
            {"name": "Память", "ok": memory["ok"], "message": memory["message"]},
        ]
    }


@router.post("/restart-backend")
async def restart_backend():
    try:
        subprocess.run(["sudo", "systemctl", "restart", "aquagid-prod"], capture_output=True)
        return {"success": True, "message": "✅ Продакшен перезапущен"}
    except:
        return {"success": False, "message": "Ошибка перезапуска"}