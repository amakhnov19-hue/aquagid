from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class ManagerCalendar(Base):
    __tablename__ = "manager_calendar"
    
    id = Column(Integer, primary_key=True, index=True)
    manager_id = Column(Integer, ForeignKey("managers.id"), unique=True, nullable=False)
    credentials = Column(Text)  # JSON с токенами
    calendar_id = Column(String(255), nullable=True)  # ID основного календаря
