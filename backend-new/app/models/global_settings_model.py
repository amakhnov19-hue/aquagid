from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class GlobalSettings(Base):
    __tablename__ = "global_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    season_start = Column(String(10), nullable=True)
    season_end = Column(String(10), nullable=True)
    work_start = Column(String(5), nullable=True)
    work_end = Column(String(5), nullable=True)
    max_duration = Column(Integer, nullable=True)
    break_minutes = Column(Integer, nullable=True)
    min_duration = Column(Integer, nullable=True)
    default_prepayment_percent = Column(Integer, nullable=True)
    slot_step_minutes = Column(Integer, default=30)
    max_photos_per_boat = Column(Integer, default=5)
    animation_duration_ms = Column(Integer, default=300)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())