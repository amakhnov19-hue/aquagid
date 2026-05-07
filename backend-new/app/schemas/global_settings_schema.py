from pydantic import BaseModel
from typing import Optional
from datetime import date, time

class GlobalSettingsBase(BaseModel):
    season_start: Optional[str] = None
    season_end: Optional[str] = None
    work_start: Optional[str] = None
    work_end: Optional[str] = None
    max_duration: Optional[int] = 8
    break_minutes: Optional[int] = 30
    min_duration: Optional[int] = 1
    default_prepayment_percent: Optional[int] = 20

class GlobalSettingsResponse(GlobalSettingsBase):
    id: int
    
    class Config:
        from_attributes = True

class GlobalSettingsUpdate(GlobalSettingsBase):
    pass