from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BoatPhotoBase(BaseModel):
    boat_id: int
    photo_url: str
    display_order: Optional[int] = 0
    mime_type: Optional[str] = None

class BoatPhotoCreate(BoatPhotoBase):
    pass

class BoatPhoto(BoatPhotoBase):
    id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True