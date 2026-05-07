from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class ManagerSettings(Base):
    __tablename__ = "manager_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    manager_id = Column(Integer, nullable=False)
    season_start = Column(String(10), nullable=True)
    season_end = Column(String(10), nullable=True)
    work_start = Column(String(5), nullable=True)
    work_end = Column(String(5), nullable=True)
    max_duration = Column(Integer, nullable=True)
    break_minutes = Column(Integer, nullable=True)
    min_duration = Column(Integer, nullable=True)
    notify_new_bookings = Column(Boolean, default=True)
    notify_cancellations = Column(Boolean, default=True)
    notify_reviews = Column(Boolean, default=True)
    notify_admin = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())