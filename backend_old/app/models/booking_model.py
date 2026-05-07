from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Numeric, Time, Date
from sqlalchemy.orm import relationship
from app.database.database import Base
from app.models.user_model import User
import datetime

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    boat_id = Column(Integer, ForeignKey("boats.id"), nullable=True)
    client_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Данные бронирования
    booking_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    
    # Финансы
    total_price = Column(Numeric(10,2), nullable=True)
    platform_commission_percent = Column(Integer, default=20)
    platform_commission_amount = Column(Numeric(10,2), nullable=True)
    prepayment_amount = Column(Numeric(10,2), nullable=True)
    
    # Статусы
    status = Column(String(20), default="pending")
    payment_status = Column(String(20), default="pending")
    payment_method = Column(String(50), nullable=True)
    
    # Клиент
    client_name = Column(String(255), nullable=True)
    client_phone = Column(String(50), nullable=True)
    client_telegram = Column(String(100), nullable=True)
    
    # Служебные поля
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    cancelled_at = Column(DateTime, nullable=True)
    hidden_for_client = Column(Boolean, default=False)
    
    # Связи
    boat = relationship("Boat", back_populates="bookings")
    client_user = relationship("User", back_populates="bookings")
    
    @property
    def manager_id(self):
        """ID менеджера через катер"""
        return self.boat.manager_id if self.boat else None
    
    @property
    def manager(self):
        """Объект менеджера через катер"""
        return self.boat.manager if self.boat else None
    
    def __repr__(self):
        return f"<Booking {self.id}: boat={self.boat_id} at {self.booking_date} {self.start_time}>"