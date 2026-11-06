# --- Stage 1: Builder ---
FROM python:3.12-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
# Устанавливаем зависимости в --user или виртуальное окружение
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir .

# --- Stage 2: Runtime ---
FROM python:3.12-slim AS runtime

WORKDIR /app

# Создаем непривилегированного пользователя для безопасности
RUN addgroup --system appgroup && adduser --system --no-create-home --group appuser

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

USER appuser

EXPOSE 8000

# Убираем --reload для production
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
