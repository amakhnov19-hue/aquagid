from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Хеш из БД
hash_from_db = "$2b$12$pexr00j3/wNB70uCI7RJsed6vDnPKvjGBI/JuzkaG7sb87TYm/pEG"

# Пароль, который вводили
password = "123456"

print("Проверка пароля:", pwd_context.verify(password, hash_from_db))
