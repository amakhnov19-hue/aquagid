from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.manager_model import Manager
from passlib.context import CryptContext
from datetime import datetime
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/managers", tags=["managers"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    company_name: str
    phone: str
    telegram: str = None
    consent_personal_data: bool = True
    consent_terms: bool = True

class RegisterResponse(BaseModel):
    id: int
    email: str
    status: str
    message: str

@router.post("/register", response_model=RegisterResponse)
async def register_manager(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Регистрация нового менеджера"""
    
    # Проверяем, существует ли email
    result = await db.execute(
        select(Manager).where(Manager.email == request.email)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    
    # Хешируем пароль
    hashed_password = pwd_context.hash(request.password)
    
    # Создаём менеджера со статусом 'pending'
    manager = Manager(
        email=request.email,
        password_hash=hashed_password,
        full_name=request.full_name,
        company_name=request.company_name,
        phone=request.phone,
        telegram_data={"username": request.telegram} if request.telegram else None,
        consent_personal_data=request.consent_personal_data,
        consent_terms=request.consent_terms,
        status="pending",
        is_active=False,
        is_email_verified=False,
        created_at=datetime.utcnow()
    )
    
    db.add(manager)
    await db.commit()
    await db.refresh(manager)
    
    # TODO: отправить уведомление админу
    
    return RegisterResponse(
        id=manager.id,
        email=manager.email,
        status=manager.status,
        message="Заявка отправлена. Ожидайте подтверждения."
    )

# ========== ДОБАВИТЬ ЭТУ ЧАСТЬ ==========

from jose import JWTError, jwt
from datetime import datetime, timedelta

SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 дней

class LoginRequest(BaseModel):
    login: EmailStr
    password: str

class LoginResponse(BaseModel):
    id: int
    email: str
    name: str
    token: str
    expires_in: int

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

from werkzeug.security import check_password_hash

@router.post("/login", response_model=LoginResponse)
async def login_manager(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Вход менеджера"""
    
    print(f"Login attempt: {request.login}")
    
    # Ищем менеджера по email
    result = await db.execute(
        select(Manager).where(Manager.email == request.login)
    )
    manager = result.scalar_one_or_none()
    
    if not manager:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    
    print(f"Manager found: {manager.email}")
    
    # Проверяем пароль через werkzeug
    if not check_password_hash(manager.password_hash, request.password):
        print("Password mismatch")
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    
    print("Password OK")
    
    # Проверяем статус
    if manager.status != "active":
        raise HTTPException(status_code=403, detail="Аккаунт не активирован")
    
    # Создаём токен
    access_token = create_access_token(
        data={"sub": str(manager.id), "email": manager.email}
    )
    
    return LoginResponse(
        id=manager.id,
        email=manager.email,
        name=manager.full_name,
        token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )