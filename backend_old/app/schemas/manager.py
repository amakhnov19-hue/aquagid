from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# Базовая схема (общие поля)
class ManagerBase(BaseModel):
    name: str
    company: Optional[str] = None
    phone: str
    email: Optional[str] = None  # теперь может быть пустым
    telegram: Optional[str] = None
    vk: Optional[str] = None
    inn: Optional[str] = None
    status: str = "pending"
    prepayment: int = Field(20, ge=0, le=30)

# Схема для создания (не нужно id и даты)
class ManagerCreate(ManagerBase):
    pass

# Схема для ответа (со всеми полями)
class Manager(ManagerBase):
    id: int
    phone_verified: bool = False
    email_verified: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True