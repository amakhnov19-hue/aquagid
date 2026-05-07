from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class BoatMaintenance(Base):
    __tablename__ = "boat_maintenance"
    
    id = Column(Integer, primary_key=True, index=True)
    boat_id = Column(Integer, ForeignKey("boats.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

