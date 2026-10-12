# api/index.py
import sys
import os

# Добавляем путь к папке backend, чтобы Python мог найти модуль app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app

# Vercel ищет переменную `app` для запуска
