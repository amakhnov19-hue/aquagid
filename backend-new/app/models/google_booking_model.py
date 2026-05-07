from sqlalchemy import Column, Integer, String, Date, Time, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class GoogleBooking(Base):
    __tablename__ = "google_bookings"
    
    id = Column(Integer, primary_key=True)
    boat_id = Column(Integer, nullable=False)
    booking_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    client_name = Column(String(255))
    client_phone = Column(String(50))
    status = Column(String(20), default='active')
    created_at = Column(DateTime, default=func.now())
    google_event_id = Column(String(255), unique=True)