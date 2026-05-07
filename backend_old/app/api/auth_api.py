from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import hashlib

from app.database.database import get_db
from app.models.manager_model import Manager
from app.schemas.manager import Manager as ManagerSchema

# Настройки JWT
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter(prefix="/api/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Простое хеширование через SHA256
def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_password_hash(plain_password) == hashed_password

async def authenticate_user(db: AsyncSession, phone: str, password: str):
    result = await db.execute(select(Manager).where(Manager.phone == phone))
    user = result.scalar_one_or_none()
    if not user:
        return False
    if not user.hashed_password:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register")
async def register(
    phone: str, 
    password: str, 
    name: str, 
    db: AsyncSession = Depends(get_db)
):
    """Регистрация нового менеджера"""
    result = await db.execute(select(Manager).where(Manager.phone == phone))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Телефон уже зарегистрирован")
    
    hashed_password = get_password_hash(password)
    
    new_manager = Manager(
        phone=phone,
        hashed_password=hashed_password,
        name=name,
        status="pending"
    )
    db.add(new_manager)
    await db.commit()
    await db.refresh(new_manager)
    
    return {"message": "Менеджер создан", "id": new_manager.id}

@router.post("/token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный телефон или пароль"
        )
    
    access_token = create_access_token(
        data={"sub": user.phone}, 
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=ManagerSchema)
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить учетные данные"
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone = payload.get("sub")
        if phone is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    result = await db.execute(select(Manager).where(Manager.phone == phone))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    
    return user