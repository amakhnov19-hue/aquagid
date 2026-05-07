from fastapi import APIRouter

router = APIRouter(prefix="/api/test", tags=["test"])

@router.get("/ping")
async def ping():
    return {"message": "pong"}

@router.post("/echo")
async def echo(data: dict):
    print(f"📥 Получено: {data}")
    return {"received": data}
