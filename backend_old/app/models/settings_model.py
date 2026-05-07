from sqlalchemy import Column, Integer, String, JSON
from app.database.database import Base

class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(JSON, nullable=False)
    
    def __repr__(self):
        return f"<Settings {self.key}>"
