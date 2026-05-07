#!/bin/bash
# Универсальный скрипт настройки прав для всех окружений AquaGid

SHARED_DIR="/var/www/shared-uploads"
USER="developer"
GROUP="www-data"

echo "🔧 Настройка прав для $SHARED_DIR"
echo "   Пользователь: $USER"
echo "   Группа: $GROUP"

# 1. Создаём структуру папок
sudo mkdir -p "$SHARED_DIR/boats"
sudo mkdir -p "$SHARED_DIR/logos"
sudo mkdir -p "$SHARED_DIR/temp"

# 2. Устанавливаем владельца и группу
sudo chown -R "$USER:$GROUP" "$SHARED_DIR"

# 3. Устанавливаем setgid-бит и права
#    2 = setgid (новые файлы наследуют группу папки)
#    775 = rwxrwxr-x (владелец и группа могут писать, остальные читать)
sudo chmod -R 2775 "$SHARED_DIR"

# 4. Исправляем права на существующие файлы (только чтение)
sudo find "$SHARED_DIR" -type f -exec chmod 664 {} \;

# 5. Устанавливаем umask для пользователя (если ещё не)
if ! grep -q "umask 002" "/home/$USER/.bashrc"; then
    echo "" >> "/home/$USER/.bashrc"
    echo "# AquaGid: umask 002 для правильных прав на файлы" >> "/home/$USER/.bashrc"
    echo "umask 002" >> "/home/$USER/.bashrc"
    echo "✅ umask 002 добавлен в .bashrc"
else
    echo "✅ umask 002 уже настроен"
fi

# 6. Применяем umask для текущей сессии
umask 002

echo ""
echo "✅ Права настроены!"
echo ""
echo "📁 Проверка:"
ls -ld "$SHARED_DIR"
ls -ld "$SHARED_DIR/boats"
echo ""
echo "💡 Не забудь перезапустить бэкенд, чтобы применился новый umask:"
echo "   pkill -f uvicorn && ... (твоя команда запуска)"
