from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import create_access_token

router = APIRouter(prefix="/admin", tags=["admin"])

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    token: str
    admin_id: int

@router.post("/auth/login", response_model=AdminLoginResponse)
async def admin_login(request: AdminLoginRequest):
    if request.username == "admin" and request.password == "admin123":
        token = create_access_token({"sub": "admin", "role": "admin"})
        return AdminLoginResponse(token=token, admin_id=1)
    raise HTTPException(status_code=401, detail="Неверный логин или пароль")