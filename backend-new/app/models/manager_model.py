from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class Manager(Base):
    __tablename__ = "managers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)  # ForeignKey("users.id")
    
    company_name = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, nullable=True)
    phone = Column(String(50), nullable=True)
    password_hash = Column(String(255), nullable=True)
    
    subdomain = Column(String(50), unique=True, nullable=True)
    status = Column(String(50), default='pending')
    
    google_calendar_id = Column(String(500), nullable=True)
    telegram_data = Column(JSON, nullable=True)

    messengers = Column(JSON, default={})  # {"telegram": "@user", "max": "user"}
    
    is_active = Column(Boolean, default=True)
    is_email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(100), nullable=True)
    
    consent_personal_data = Column(Boolean, default=False)
    consent_terms = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    prepayment_percent = Column(Integer, default=20)

    referral_code = Column(String(50), unique=True, nullable=True)
    referral_discount_percent = Column(Integer, default=10)
    referral_mode = Column(String(20), default='all_boats')  # 'own_only' или 'all_boats'