#!/bin/bash
# Автофикс зависимостей беты (копирует из experimental)
cp -r /var/www/aquagid-experimental/backend-new/venv/lib/python3.12/site-packages/werkzeug* /var/www/beta/backend-new/venv/lib/python3.12/site-packages/ 2>/dev/null
cp -r /var/www/aquagid-experimental/backend-new/venv/lib/python3.12/site-packages/markupsafe* /var/www/beta/backend-new/venv/lib/python3.12/site-packages/ 2>/dev/null
