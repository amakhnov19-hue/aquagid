from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Преобразуем URL для асинхронного драйвера
DB_URL_ASYNC = settings.DB_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DB_URL_ASYNC, echo=settings.DEBUG)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
async_session_maker = AsyncSessionLocal  # ← добавить эту строку
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session