from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.database.database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    telegram = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Связи
    bookings = relationship("Booking", back_populates="client_user")
    
    def __repr__(self):
        return f"<User {self.id}: {self.phone}>"

