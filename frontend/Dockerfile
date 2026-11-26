# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 2: Production Nginx Server ---
FROM nginx:alpine AS runtime

# Копируем кастомный конфиг Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранную статику с правами только на чтение для пользователя nginx
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Выдаем права пользователю nginx на рабочие директории (логи, кеш, pid-файл)
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Переключаемся с root на обычного пользователя
USER nginx

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
