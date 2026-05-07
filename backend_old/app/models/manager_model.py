from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database.database import Base
import datetime

class Manager(Base):
    __tablename__ = "managers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    company = Column(String)
    phone = Column(String, unique=True, nullable=False)
    phone_verified = Column(Boolean, default=False)
    email = Column(String, nullable=True)
    email_verified = Column(Boolean, default=False)
    hashed_password = Column(String, nullable=True)
    telegram = Column(String, nullable=True)
    vk = Column(String, nullable=True)
    inn = Column(String, nullable=True)
    status = Column(String, default="pending")
    prepayment = Column(Integer, default=20)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Связь с катерами (есть)
    boats = relationship("Boat", back_populates="manager")
    
    # Связь с бронированиями убираем, так как она идет через катера
    # bookings = relationship("Booking", back_populates="manager")  # ← удаляем
    
    def __repr__(self):
        return f"<Manager {self.name}>"