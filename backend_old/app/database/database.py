from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Получаем URL БД из переменных окружения
DB_URL = os.getenv("DB_URL", "postgresql://postgres:postgres@127.0.0.1:5432/aquagid_dev")

# Конвертируем для asyncpg (заменяем postgresql:// на postgresql+asyncpg://)
if DB_URL.startswith("postgresql://"):
    ASYNC_DB_URL = DB_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    ASYNC_DB_URL = DB_URL

# Создаем движок
engine = create_async_engine(ASYNC_DB_URL, echo=True)

# Создаем фабрику сессий
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Базовый класс для моделей
Base = declarative_base()

# Функция для получения сессии
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session