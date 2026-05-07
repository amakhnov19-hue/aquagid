from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class BoatBase(BaseModel):
    name: str
    capacity: Optional[int] = None
    price_per_hour: Optional[float] = None
    description_short: Optional[str] = None
    description_full: Optional[str] = None
    boarding_address: Optional[str] = None
    is_active: bool = True
    activation_status: str = "inactive"
    prepayment_percent: int = 20
    main_photo_url: Optional[str] = None
    deleted_at: Optional[datetime] = None
    latitude: Optional[float] = None  # ← добавить
    longitude: Optional[float] = None  # ← добавить

class BoatCreate(BoatBase):
    manager_id: int

class Boat(BoatBase):
    id: int
    manager_id: Optional[int] = None
    created_at: datetime
    activated_at: Optional[datetime] = None
    deactivated_at: Optional[datetime] = None
    photos: List[str] = []
    latitude: Optional[float] = None  # ← добавить (можно не дублировать, если уже в Base)
    longitude: Optional[float] = None  # ← добавить
    
    class Config:
        from_attributes = True