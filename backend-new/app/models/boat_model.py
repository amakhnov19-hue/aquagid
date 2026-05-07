from sqlalchemy import Column, Integer, String, Float, Boolean, Text, Numeric, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Boat(Base):
    __tablename__ = "boats"
    
    id = Column(Integer, primary_key=True, index=True)
    manager_id = Column(Integer, nullable=True)
    name = Column(String(255), nullable=False)
    capacity = Column(Integer, nullable=True)
    price_per_hour = Column(Numeric(10, 2), nullable=True)
    description_full = Column(Text, nullable=True)
    description_short = Column(Text, nullable=True)
    boarding_address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    activation_status = Column(String(20), default='inactive')
    activated_at = Column(DateTime, nullable=True)
    deactivated_at = Column(DateTime, nullable=True)
    prepayment_percent = Column(Integer, default=20)
    main_photo_url = Column(Text, nullable=True)
    captain_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=func.now())
    deleted_at = Column(DateTime, nullable=True)
    
    # Новые поля для краткой карточки
    has_canopy = Column(Boolean, default=False)
    has_toilet = Column(Boolean, default=False)
    has_audio = Column(Boolean, default=False)
    has_fridge = Column(Boolean, default=False)
    has_blankets = Column(Boolean, default=False)
    has_kitchenware = Column(Boolean, default=False)
    has_maintenance = Column(Boolean, default=False)
    maintenance_start = Column(DateTime, nullable=True)
    maintenance_end = Column(DateTime, nullable=True)
    is_refueling = Column(Boolean, default=False)
    is_breakdown = Column(Boolean, default=False)
    refuel_end_time = Column(DateTime, nullable=True)

    pricing_method = Column(String(20), default='percent')
    open_price = Column(Numeric(10, 2), nullable=True)
    agent_price = Column(Numeric(10, 2), nullable=True)

    # Поля модерации
    approved_price_per_hour = Column(Numeric(10, 2), nullable=True)
    approved_prepayment_percent = Column(Integer, nullable=True)
    approved_open_price = Column(Numeric(10, 2), nullable=True)
    approved_agent_price = Column(Numeric(10, 2), nullable=True)
    moderation_status = Column(String(20), default='draft')
    admin_notes = Column(Text, nullable=True)
    last_moderation_at = Column(DateTime, nullable=True)
    last_moderation_by = Column(Integer, nullable=True)

    # Relationship с фото
    photos = relationship("BoatPhoto", back_populates="boat", lazy="select")