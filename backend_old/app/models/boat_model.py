from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Numeric, Float, inspect
from sqlalchemy.orm import relationship
from app.database.database import Base, engine
import datetime
import logging

logger = logging.getLogger(__name__)

class Boat(Base):
    __tablename__ = "boats"
    
    id = Column(Integer, primary_key=True, index=True)
    manager_id = Column(Integer, ForeignKey("managers.id"), nullable=True)
    name = Column(String(255), nullable=False)
    capacity = Column(Integer, nullable=True)
    price_per_hour = Column(Numeric(10,2), nullable=True)
    description_full = Column(Text, nullable=True)
    description_short = Column(Text, nullable=True)
    boarding_address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    activation_status = Column(String(20), default="inactive")
    activated_at = Column(DateTime, nullable=True)
    deactivated_at = Column(DateTime, nullable=True)
    prepayment_percent = Column(Integer, default=20)
    main_photo_url = Column(Text, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Связи
    manager = relationship("Manager", back_populates="boats")
    bookings = relationship("Booking", back_populates="boat")
    photos = relationship("BoatPhoto", back_populates="boat", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Boat {self.name}>"


class BoatPhoto(Base):
    __tablename__ = "boat_photos"
    
    id = Column(Integer, primary_key=True, index=True)
    boat_id = Column(Integer, ForeignKey("boats.id", ondelete="CASCADE"), nullable=False)
    photo_url = Column(Text, nullable=False)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    mime_type = Column(String(50), nullable=True)
    
    boat = relationship("Boat", back_populates="photos")
    
    def __repr__(self):
        return f"<BoatPhoto {self.id} for boat {self.boat_id}>"


# Асинхронная проверка колонок
async def ensure_columns_async():
    try:
        # Используем run_sync для выполнения синхронного кода в асинхронном контексте
        async with engine.connect() as conn:
            def sync_inspect(sync_conn):
                insp = inspect(sync_conn)
                columns = [col['name'] for col in insp.get_columns('boats')]
                logger.info(f"✅ Реальные колонки в БД: {columns}")
                
                model_columns = [c.name for c in Boat.__table__.columns]
                logger.info(f"✅ Колонки в модели Boat: {model_columns}")
                
                if 'latitude' not in columns:
                    logger.error("❌ Колонка latitude отсутствует в БД! Добавьте её вручную:")
                else:
                    logger.info("✅ Колонка latitude найдена в БД")
                    
                if 'longitude' not in columns:
                    logger.error("❌ Колонка longitude отсутствует в БД! Добавьте её вручную:")
                else:
                    logger.info("✅ Колонка longitude найдена в БД")
                    
            await conn.run_sync(sync_inspect)
    except Exception as e:
        logger.error(f"❌ Ошибка при проверке колонок: {e}")

# Запускаем асинхронную проверку
import asyncio
asyncio.create_task(ensure_columns_async())