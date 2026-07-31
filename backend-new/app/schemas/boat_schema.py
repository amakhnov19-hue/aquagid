from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.boat_photo_schema import BoatPhoto

# Базовая схема со всеми полями из реальной таблицы
class BoatBase(BaseModel):
    manager_id: Optional[int] = None
    name: str
    slug: Optional[str] = None  # <-- ДОБАВИТЬ
    capacity: Optional[int] = None
    price_per_hour: Optional[float] = None
    description_full: Optional[str] = None
    description_short: Optional[str] = None
    boarding_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    main_photo_url: Optional[str] = None
    captain_name: Optional[str] = None
    prepayment_percent: Optional[int] = 20
    is_active: bool = True
    activation_status: str = "inactive"
    has_canopy: Optional[bool] = False
    has_toilet: Optional[bool] = False
    has_audio: Optional[bool] = False
    has_fridge: Optional[bool] = False
    has_blankets: Optional[bool] = False
    has_kitchenware: Optional[bool] = False
    has_maintenance: Optional[bool] = False
    maintenance_start: Optional[datetime] = None
    maintenance_end: Optional[datetime] = None
    is_refueling: Optional[bool] = False
    is_breakdown: Optional[bool] = False
    refuel_end_time: Optional[datetime] = None
    pricing_method: Optional[str] = 'percent'
    open_price: Optional[float] = None
    agent_price: Optional[float] = None
        # Поля модерации
    approved_price_per_hour: Optional[float] = None
    approved_prepayment_percent: Optional[int] = None
    approved_open_price: Optional[float] = None
    approved_agent_price: Optional[float] = None
    moderation_status: str = "draft"
    admin_notes: Optional[str] = None
    last_moderation_at: Optional[datetime] = None
    last_moderation_by: Optional[int] = None

# Для создания нового катера (админка)
class BoatCreate(BoatBase):
    pass

# Для обновления катера
class BoatUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    price_per_hour: Optional[float] = None
    description_full: Optional[str] = None
    description_short: Optional[str] = None
    boarding_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    main_photo_url: Optional[str] = None
    captain_name: Optional[str] = None
    prepayment_percent: Optional[int] = None
    is_active: Optional[bool] = None
    activation_status: Optional[str] = None
    has_canopy: Optional[bool] = None
    has_toilet: Optional[bool] = None
    has_audio: Optional[bool] = None
    has_fridge: Optional[bool] = None
    has_blankets: Optional[bool] = None
    has_kitchenware: Optional[bool] = None
    pricing_method: Optional[str] = None
    open_price: Optional[float] = None
    agent_price: Optional[float] = None
    approved_price_per_hour: Optional[float] = None
    approved_prepayment_percent: Optional[int] = None
    approved_open_price: Optional[float] = None
    approved_agent_price: Optional[float] = None
    moderation_status: Optional[str] = None
    admin_notes: Optional[str] = None
    last_moderation_at: Optional[datetime] = None
    last_moderation_by: Optional[int] = None
    has_maintenance: Optional[bool] = None
    maintenance_start: Optional[datetime] = None
    maintenance_end: Optional[datetime] = None
    is_refueling: Optional[bool] = None
    is_breakdown: Optional[bool] = None
    refuel_end_time: Optional[datetime] = None

# Для ответа (полная информация)
class Boat(BoatBase):
    id: int
    manager_id: Optional[int] = None
    created_at: Optional[datetime] = None
    activated_at: Optional[datetime] = None
    deactivated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    photos: List[BoatPhoto] = []
    approved_price_per_hour: Optional[float] = None
    approved_prepayment_percent: Optional[int] = None
    approved_open_price: Optional[float] = None
    approved_agent_price: Optional[float] = None
    moderation_status: str = "draft"
    admin_notes: Optional[str] = None
    last_moderation_at: Optional[datetime] = None
    last_moderation_by: Optional[int] = None
    has_maintenance: Optional[bool] = False
    maintenance_start: Optional[datetime] = None
    maintenance_end: Optional[datetime] = None
    is_refueling: Optional[bool] = False
    is_breakdown: Optional[bool] = False
    refuel_end_time: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Для списка катеров (краткая информация)
class BoatListItem(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None  # <-- ДОБАВИТЬ
    capacity: Optional[int] = None
    price_per_hour: Optional[float] = None
    main_photo_url: Optional[str] = None
    description_short: Optional[str] = None
    boarding_address: Optional[str] = None
    latitude: Optional[float] = None 
    longitude: Optional[float] = None
    bookings_today: int = 0  # ← добавить
    bookings_total: int = 0  # ← добавить
    has_canopy: Optional[bool] = False
    has_toilet: Optional[bool] = False
    has_audio: Optional[bool] = False
    has_fridge: Optional[bool] = False
    has_blankets: Optional[bool] = False
    has_kitchenware: Optional[bool] = False
    pricing_method: Optional[str] = 'percent'
    open_price: Optional[float] = None
    agent_price: Optional[float] = None
    
    class Config:
        from_attributes = True