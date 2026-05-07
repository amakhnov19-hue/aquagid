import os

class Config:
    # База данных
    DB_URL = os.getenv("DB_URL")
    
    # Безопасность
    JWT_SECRET = os.getenv("JWT_SECRET")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
    
    # Email
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    
    # Telegram (по ролям)
    TELEGRAM_CLIENT_TOKEN = os.getenv("TELEGRAM_CLIENT_TOKEN")
    TELEGRAM_MANAGER_TOKEN = os.getenv("TELEGRAM_MANAGER_TOKEN")
    TELEGRAM_ADMIN_TOKEN = os.getenv("TELEGRAM_ADMIN_TOKEN")
    TELEGRAM_BOT_NAME = os.getenv("TELEGRAM_BOT_NAME", "AquaGidBot")
    
    # Яндекс
    YANDEX_GEOCODER_API_KEY = os.getenv("YANDEX_GEOCODER_API_KEY")

config = Config()