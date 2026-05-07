from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, time

# Базовая схема (соответствует полям в БД)
class BookingBase(BaseModel):
    boat_id: Optional[int] = None
    client_user_id: Optional[int] = None
    
    booking_date: date
    start_time: time
    duration_minutes: int
    
    total_price: Optional[float] = None
    platform_commission_percent: int = 20
    platform_commission_amount: Optional[float] = None
    prepayment_amount: Optional[float] = None
    
    status: str = "pending"
    payment_status: str = "pending"
    payment_method: Optional[str] = None
    
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_telegram: Optional[str] = None
    
    hidden_for_client: bool = False

# Для создания бронирования
class BookingCreate(BookingBase):
    pass

# Для ответа
class Booking(BookingBase):
    id: int
    created_at: datetime
    cancelled_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True