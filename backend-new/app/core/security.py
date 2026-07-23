from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt
from datetime import datetime, timedelta
import os

# Берем настройки из .env
SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET не задан в переменных окружения!")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def get_current_admin(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role = payload.get("role")
        if role != "admin":
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return payload
    except jwt.PyJWTError:
        raise credentials_exception

def get_current_manager(token: str = Depends(oauth2_scheme)):
    print(f"DEBUG: token in get_current_manager: {token[:50]}...")
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"DEBUG: payload: {payload}")
        role = payload.get("role")
        if role not in ["manager", "admin"]:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return payload
    except jwt.PyJWTError as e:
        print(f"DEBUG: JWTError: {e}")
        raise credentials_exception

from werkzeug.security import generate_password_hash, check_password_hash

def get_password_hash(password: str) -> str:
    """Хеширует пароль с использованием scrypt"""
    return generate_password_hash(password, method='scrypt')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяет пароль"""
    return check_password_hash(hashed_password, plain_password)