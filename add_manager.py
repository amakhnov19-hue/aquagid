import psycopg2

hash_full = "scrypt:32768:8:1$iebBkqWsXXZNYSz1$f58f6522d72ffdc64bd86fe718d3ac6e420e32756d247f5990f1e9834fdd5d9c21b81edcd50509738ddf4e5dbddf751e1da4bdf8e5a1829d595cc18ab3f4387c"

conn = psycopg2.connect(
    host="localhost",
    database="aquagid_proper",
    user="postgres",
    password="postgres"
)
cur = conn.cursor()
cur.execute("DELETE FROM managers WHERE email='test5@test.ru'")
cur.execute("INSERT INTO managers (email, password_hash, full_name, company_name, phone, status, is_active) VALUES (%s, %s, %s, %s, %s, %s, %s)", 
            ('test5@test.ru', hash_full, 'Тестовый', 'Компания', '123', 'active', True))
conn.commit()
cur.execute("SELECT length(password_hash) FROM managers WHERE email='test5@test.ru'")
print(cur.fetchone())
conn.close()