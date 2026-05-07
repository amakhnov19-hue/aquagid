from pydantic import BaseModel
from typing import Optional
from datetime import date, time, datetime

# Базовая схема для бронирования
class BookingBase(BaseModel):
    boat_id: int
    booking_date: date
    start_time: time
    duration_minutes: int
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_telegram: Optional[str] = None
    client_messenger_type: Optional[str] = None
    client_messenger_contact: Optional[str] = None

# Для создания бронирования (то, что приходит с фронтенда)
class BookingCreate(BookingBase):
    client_user_id: Optional[int] = None
    payment_id: Optional[str] = None
    prepayment_amount: Optional[float] = None
    status: Optional[str] = "pending"

# Для ответа (после создания)
class BookingResponse(BaseModel):
    id: int
    boat_id: int
    booking_date: date
    start_time: time
    duration_minutes: int
    status: str
    total_price: Optional[float] = None
    prepayment_amount: Optional[float] = None
    created_at: datetime
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_telegram: Optional[str] = None
    client_messenger_type: Optional[str] = None
    client_messenger_contact: Optional[str] = None
    cancellation_requested: bool = False
    google_event_id: Optional[str] = None
    source: Optional[str] = None  # ← добавить
    boat: Optional[dict] = None 
    viewed_at: Optional[datetime] = None

# Для проверки доступности
class AvailabilityCheck(BaseModel):
    boat_id: Optional[int] = None
    booking_date: date
    start_time: time
    duration_minutes: int

class AvailabilityResponse(BaseModel):
    available: bool
    boat_id: Optional[int] = None
    message: Optional[str] = None
    alternative_times: Optional[list[time]] = None
    
    class Config:
        from_attributes = True