#!/bin/bash
# Скрипт деплоя на продакшен
# Использование: ./deploy.sh [тег]

set -e

TAG=${1:-latest}
PROD_DIR="/opt/aquabooking"
SOURCE_DIR="/home/developer/projects/aquagid-experimental"

echo "🚀 Деплой версии: $TAG"

# 1. Копируем файлы
echo "📁 Копирование файлов..."
rsync -av --delete \
    --exclude '.git' \
    --exclude 'venv' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude 'backup' \
    --exclude 'node_modules' \
    "$SOURCE_DIR/" "$PROD_DIR/"

# 2. Копируем .env если есть
if [ -f "$SOURCE_DIR/deploy/.env" ]; then
    cp "$SOURCE_DIR/deploy/.env" "$PROD_DIR/deploy/.env"
    echo "✅ .env скопирован"
else
    echo "⚠️ .env не найден! Создайте из .env.example"
fi

# 3. Билдим и запускаем
echo "🔧 Сборка контейнеров..."
cd "$PROD_DIR/deploy"
podman-compose build backend
podman-compose up -d

echo "✅ Деплой завершён!"
echo "📍 https://24aquabooking.ru"
