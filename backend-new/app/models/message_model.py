from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, func
from app.core.database import Base

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_type = Column(String(20), nullable=False)
    sender_id = Column(String(50), nullable=False)
    receiver_type = Column(String(20), nullable=False)
    receiver_id = Column(String(50), nullable=False)
    type = Column(String(30), default='chat')
    title = Column(String(255))
    body = Column(Text)
    related_booking_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    status = Column(String(20), default='new')
    created_at = Column(DateTime, server_default=func.now())

