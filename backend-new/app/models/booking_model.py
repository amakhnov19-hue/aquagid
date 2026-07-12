from sqlalchemy import Column, Integer, String, Numeric, Date, Time, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    boat_id = Column(Integer, nullable=False)  # ForeignKey("boats.id")
    client_user_id = Column(Integer, nullable=True)  # ForeignKey("users.id")
    
    # Временные параметры
    booking_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    
    # Финансы
    total_price = Column(Numeric(10, 2), nullable=True)
    platform_commission_percent = Column(Integer, default=20)
    platform_commission_amount = Column(Numeric(10, 2), nullable=True)
    prepayment_amount = Column(Numeric(10, 2), nullable=True)
    
    # Статусы
    status = Column(String(20), default='pending')  # pending, confirmed, cancelled, completed
    payment_status = Column(String(20), default='pending')  # pending, paid, refunded
    payment_method = Column(String(50), nullable=True)
    
    # Клиентские данные
    client_name = Column(String(255), nullable=True)
    client_passengers = Column(Integer, default=1)
    client_phone = Column(String(50), nullable=True)
    client_telegram = Column(String(100), nullable=True)
    client_messenger_type = Column(String(10), nullable=True)
    client_messenger_contact = Column(String(100), nullable=True)
    client_email = Column(String(255), nullable=True)
    
    # Отмена бронирования
    cancellation_requested = Column(Boolean, default=False)
    cancellation_requested_at = Column(DateTime, nullable=True)
    cancellation_confirmed_at = Column(DateTime, nullable=True)
    
    # Служебные поля
    created_at = Column(DateTime, default=func.now())
    cancelled_at = Column(DateTime, nullable=True)
    hidden_for_client = Column(Boolean, default=False)
    source = Column(String(20), default='manual')
    ref_code = Column(String(50), nullable=True)
    google_event_id = Column(String(255), nullable=True)
    viewed_at = Column(DateTime, nullable=True)
    boat = None  # Вычисляемое поле