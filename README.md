# 🚤 AquaGid 2.0 — Система бронирования катеров

Полностью онлайн-сервис: клиент выбирает катер, дату, оплачивает — без звонков.

## 🌐 Домены
- 24aquabooking.ru — Лендинг
- app.24aquabooking.ru — Клиент
- manager.24aquabooking.ru — Менеджер
- admin.24aquabooking.ru — Админ
- beta.24aquabooking.ru — Бета

## 🖥️ Сервер
- Timeweb, 31.130.147.28
- PostgreSQL: aquagid_prod / aquagid_beta
- FastAPI: порт 8084 (прод), 8083 (бета)
- Nginx: /etc/nginx/sites-available/24aquabooking.ru

## 📁 Структура
/var/www/production/
├── frontend/
│   ├── landing/
│   ├── mini-app/public/web-client/
│   ├── manager-panel/
│   ├── admin-new/
│   └── shared/
├── backend-new/
└── shared-uploads/

## ⚙️ Порядок работы
1. Правим в /home/developer/projects/aquagid-experimental/
2. Копируем на прод: sudo cp ... /var/www/production/...
3. Перезапуск: sudo systemctl restart aquagid-prod
4. Коммит: git add ... && git commit ... && git push

## 🚀 Команды
sudo systemctl status aquagid-prod
tail -50 /var/log/aquagid-prod.log
curl -X POST "http://127.0.0.1:8084/api/sync/google/import/{manager_id}?days=90"
