# 🔄 Google Calendar — логика синхронизации (AquaGid 2.0)
# Обновлено: 2026-05-14

## 📁 Файлы, участвующие в работе с GC

### Бэкенд
- `routes/google_calendar.py` — OAuth, подключение/отключение, webhook, импорт
- `routes/google_webhook.py` — создание канала webhook
- `services/sync/sync_service.py` — централизованный сервис (экспорт, импорт, удаление)
- `routes/bookings.py` — `delete_booking`, `confirm_payment`, `cleanup_pending`
- `config.py` / переменные окружения — GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, BASE_URL

### Фронтенд
- `ManagerPanel/js/ManagerApp.js` — WebSocket, меню, чат
- `ManagerPanel/js/components/bookings/Bookings.js` — список броней, удаление
- `ManagerPanel/js/components/calendar/Calendar.js` — календарь (день/месяц)
- `ManagerPanel/js/components/settings/Settings.js` — настройки, погода
- `ManagerPanel/js/components/WeatherWidget.js` — виджет погоды (drag-and-drop)

---

## 🔁 Алгоритмы

### 1. Экспорт брони в GC
- Происходит автоматически при подтверждении оплаты (статус → `active`)
- `bookings.py:confirm_payment` → `sync_service.export_booking()`
- WebSocket `bookings_updated` отправляется менеджеру

### 2. Импорт из GC (ручной/авто)
- Webhook → `google_calendar.py:google_webhook` → `do_import_from_calendar()`
- Парсинг названий: `([\w\s\-]+?)\s*-\s*(.+?)`
- Сверка удалённых: Google-брони без google_event_id в БД → удаляются
- Debounce: 10 секунд между импортами

### 3. Удаление брони
- `delete_booking`: удаляет из БД, затем из GC через `sync_service.delete_event()`
- `cleanup_pending`: крон */5 мин → эндпоинт → удаление просроченных pending + очистка GC

### 4. Webhook
- Создаётся при подключении календаря
- Авто-пересоздаётся при `do_import_from_calendar()`, если истекает < 1 часа
- URL: `https://manager.beta.24aquabooking.ru/api/sync/google/webhook`
- Логирование: `print()` (не `logging`)

---

## ⚠️ Решённые проблемы

| # | Проблема | Решение | Дата |
|---|---------|---------|------|
| 1 | Удаление Google-брони (двустороннее) | `delete_booking` → `sync_service.delete_event()` | 13.05 |
| 2 | Regex для названий с цифрами | `([\w\s\-]+?)` | 13.05 |
| 3 | WebSocket → обновление Bookings | `loadBookings()` в `onmessage` | 13.05 |
| 4 | Авто-пересоздание webhook | Проверка в `do_import_from_calendar` | 13.05 |
| 5 | 429 лавина запросов | Debounce 10 сек | 13.05 |
| 6 | `cleanup-pending` с удалением из GC | Эндпоинт + крон | 13.05 |
| 7 | WebSocket при `confirm_payment` | `ws_manager.send_update()` | 13.05 |
| 8 | Календарь "День" с 09:00 | Учёт `workStart` из настроек | 13.05 |
| 9 | Логи терялись после ротации | `copytruncate` в logrotate | 14.05 |
| 10 | 500 ошибка при удалении | Индексы `booking_row[3]` вместо `[4]` | 14.05 |

---

## 🔧 Погода (WeatherWidget)
- Включается в Настройках (галочка "Показывать виджет погоды")
- Drag-and-drop (мышь + touch)
- Крестик для скрытия
- Позиция сохраняется в localStorage

---

## 🖥️ Окружение beta
- Сервис: `aquagid-beta` (порт 8083)
- Путь: `/var/www/beta/`
- Логи: `/var/log/aquagid-beta.log` (rotate с `copytruncate`)
- БД: `aquagid_beta`
- Крон cleanup-pending: `*/5 * * * * curl -s -X POST http://127.0.0.1:8083/api/bookings/cleanup-pending`
