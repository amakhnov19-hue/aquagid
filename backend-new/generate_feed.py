#!/usr/bin/env python3
import psycopg2
import xml.etree.ElementTree as ET
from xml.dom import minidom
from datetime import datetime

# Подключаемся к продакшен-БД
DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/aquagid_prod"
print("✅ Используем продакшен-БД")

# Путь для сохранения фида
output_path = '/var/www/production/frontend/landing/feed.yml'

# Подключаемся к БД
conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Забираем активные катера
cursor.execute("""
    SELECT id, name, price_per_hour, description_short, main_photo_url, 
           boarding_address, capacity, description_full
    FROM boats 
    WHERE is_active = true AND moderation_status = 'approved'
""")
boats = cursor.fetchall()

# Создаём YML
root = ET.Element("yml_catalog", date=datetime.now().strftime("%Y-%m-%d %H:%M"))
shop = ET.SubElement(root, "shop")
ET.SubElement(shop, "name").text = "Аквагид"
ET.SubElement(shop, "company").text = "Аквагид"
ET.SubElement(shop, "url").text = "https://24aquabooking.ru"

currencies = ET.SubElement(shop, "currencies")
currency = ET.SubElement(currencies, "currency", id="RUB", rate="1")

categories = ET.SubElement(shop, "categories")
category = ET.SubElement(categories, "category", id="1")
category.text = "Аренда катеров"

offers = ET.SubElement(shop, "offers")
for boat in boats:
    boat_id, name, price, desc_short, photo, address, capacity, desc_full = boat
    
    offer = ET.SubElement(offers, "offer", id=str(boat_id), available="true")
    ET.SubElement(offer, "url").text = f"https://app.24aquabooking.ru/boat/{boat_id}"
    ET.SubElement(offer, "price").text = str(int(price)) if price else "0"
    ET.SubElement(offer, "currencyId").text = "RUB"
    ET.SubElement(offer, "categoryId").text = "1"
    
    full_name = f"{name} (до {capacity} чел.)"
    ET.SubElement(offer, "name").text = full_name
    
    description = desc_full or desc_short or f"Аренда катера {name} в Санкт-Петербурге"
    ET.SubElement(offer, "description").text = description
    
    if photo:
        ET.SubElement(offer, "picture").text = f"https://24aquabooking.ru{photo}"
    
    if address:
        ET.SubElement(offer, "param", name="Адрес").text = address
    ET.SubElement(offer, "param", name="Вместимость").text = f"{capacity} чел."

# Сохраняем
xml_str = minidom.parseString(ET.tostring(root)).toprettyxml(indent="  ")
with open(output_path, "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8" standalone="yes"?>\n')
    f.write(xml_str)

print(f"✅ Фид создан: {output_path}")
print(f"📊 Добавлено катеров: {len(boats)}")

conn.close()