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
        with open('/proc/meminfo', 'r') as f:
            lines = f.readlines()
        total = int([l for l in lines if 'MemTotal' in l][0].split()[1])
        available = int([l for l in lines if 'MemAvailable' in l][0].split()[1])
        used = total - available
        used_percent = (used / total) * 100
        return {
            "ok": used_percent < 90,
            "message": f"Использовано {used_percent:.0f}% ({used//1024} МБ из {total//1024} МБ)"
        }
    except:
        return {"ok": False, "message": "Ошибка проверки памяти"}


def check_port(port):
    """Проверка что порт слушается"""
    try:
        import socket
        s = socket.socket()
        s.settimeout(2)
        s.connect(('127.0.0.1', port))
        s.close()
        return True
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
