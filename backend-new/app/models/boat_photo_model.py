from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class BoatPhoto(Base):
    __tablename__ = "boat_photos"
    
    id = Column(Integer, primary_key=True, index=True)
    boat_id = Column(Integer, ForeignKey("boats.id"), nullable=False)
    photo_url = Column(Text, nullable=False)
    display_order = Column(Integer, default=0)
    mime_type = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=func.now())
    # Relationship с катером
    boat = relationship("Boat", back_populates="photos")