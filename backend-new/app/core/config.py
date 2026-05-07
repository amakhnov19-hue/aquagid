from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional

class Settings(BaseSettings):
    # База данных
    DB_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/aquagid_proper"
    
    # JWT
    JWT_SECRET: str = "your-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # SMS
    SMS_PROVIDER: Optional[str] = None
    SMS_API_KEY: Optional[str] = None
    SMS_FROM: Optional[str] = "AquaGid"
    
    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    # Telegram
    TELEGRAM_MINI_PROD_TOKEN: Optional[str] = None
    TELEGRAM_OFFICE_PROD_TOKEN: Optional[str] = None
    TELEGRAM_ADMIN_PROD_TOKEN: Optional[str] = None
    
    # Яндекс
    YANDEX_GEOCODER_API_KEY: Optional[str] = None
    
    # Общие настройки
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    model_config = ConfigDict(env_file=".env", extra="ignore")

settings = Settings()
