from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Базовая схема
class UserBase(BaseModel):
    telegram_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "client"

# Для создания
class UserCreate(UserBase):
    password: Optional[str] = None

# Для ответа
class User(UserBase):
    id: int
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

# Для авторизации по телефону
class PhoneAuthRequest(BaseModel):
    phone: str

class PhoneAuthVerify(BaseModel):
    phone: str
    code: str

# Для ответа с токеном
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User
