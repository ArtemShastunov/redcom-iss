# Redkom ISS

Сервис оценки звонков операторов информационно-справочной службы
АО «Рэдком-Интернет».

Заменяет ручную работу в Excel-файле «Совместные итоги_<Месяц>.xlsx»:
принимает ведомости оценок от супервайзеров, считает производные оценки
и премии по Положению о премировании, экспортирует результат обратно
в Excel.

## Стек

**Backend**
- Python 3.12, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL 16
- openpyxl — импорт и экспорт Excel
- Argon2 — хеш паролей, itsdangerous — подписанная cookie-сессия

**Frontend**
- React 18 + TypeScript + Vite
- React Router, TanStack Query
- Tailwind CSS

**Инфраструктура**
- Docker Compose: три сервиса — `db`, `api`, `frontend`

## Быстрый старт

    docker compose up -d --build
    docker compose exec api alembic upgrade head
    docker compose exec api python -m app.cli create-user \
        --login admin --full-name "Админ" --role admin --password 1120

Открыть:

- Веб-интерфейс: http://localhost:5173
- API docs: http://localhost:8088/api/docs
- PostgreSQL: localhost:5432 (redkom / redkom / redkom_iss)

## Роли

- `supervisor` — супервайзер. Вносит оценки звонков операторов,
  редактирует только свои. Видит расчёт по всем.
- `head` — начальник ИСС. Всё, что супервайзер, плюс: управление периодами
  (открыть/закрыть), override производных оценок, calls_handled, критические
  ошибки, норма супервайзеров, экспорт.
- `admin` — то же, что head, плюс управление операторами и пользователями.

## CLI

Все команды выполняются через
`docker compose exec api python -m app.cli <команда>`.

### create-user

    python -m app.cli create-user \
        --login admin --full-name "Админ" --role admin --password 1120

Без `--password` пароль спрашивается в промпте.

### import-iss-xlsx

Импорт ведомости оценок из Excel. Формат — «Совместные итоги_<Месяц>.xlsx».
Файл положить в `backend/data/`.

    python -m app.cli import-iss-xlsx \
        "/app/data/Совместные итоги_Сентябрь.xlsx" \
        --year 2026 --month 9

Импорт идемпотентен: повторный запуск пересоздаёт оценки за период.
Период создаётся со статусом `closed`. Листы супервайзеров («София»,
«Ольга») пропускаются: в них нет колонки с оператором, привязать оценки
не к кому — эти супервайзеры получают премию по своим правилам.

### export-iss-xlsx

Выгрузка ведомости в Excel (на диск).

    python -m app.cli export-iss-xlsx \
        "/app/data/Экспорт_Сентябрь_2026.xlsx" \
        --year 2026 --month 9


### fill-premium-names

Заполнить `operators.premium_name` по файлу премий. Матчинг по фамилии:
если в файле ровно одна строка с такой фамилией — присваиваем.

    python -m app.cli fill-premium-names "/app/data/премия_09.xlsx"

Опция `--force` — перезаписать уже заполненные.

### import-premiums-xlsx

Загрузить число звонков и чатов из файла премий (Fastcom/1С).

    python -m app.cli import-premiums-xlsx "/app/data/премия_09.xlsx" \
        --year 2026 --month 9

Файл должен быть `.xlsx` (пересохрани из `.xls`, если пришёл старый формат).
Идемпотентен: повторный запуск перезаписывает числа за период.

### delete-period

Удалить период и все его оценки.

    python -m app.cli delete-period --year 2026 --month 10

### reset-db

Удалить всех операторов, периоды и оценки. Пользователи остаются,
если не передан `--with-users`.

    python -m app.cli reset-db
    python -m app.cli reset-db --with-users --yes

## Правила расчёта

Источник истины — «Положение о премировании работников ИСС».
Правила из §3.5:

- **Тон**: -1, если есть хоть одна оценка -1; +1, если есть ≥2 оценок +1;
  иначе 0.
- **Полнота ответа**: -1, если ≥3 оценок -1; +1, если ≥3 оценок +1; иначе 0.
- **Диалог в 1С**: -1, если ≥6 оценок -1; 0, если ≥3 оценок -1; иначе +1.
- **Сводная** = floor((тон + полнота + диалог) / 3).

Excel-файл «Совместные итоги» исторически считал производные как
`INT(AVERAGE(...))` в одних ячейках и ручными константами в других —
единого алгоритма там нет. Поэтому источник истины — Положение,
а не Excel. Если начальник ИСС не согласен с авторасчётом по конкретному
оператору — он использует override.

### Премии

- Топ-6 операторов по числу обработанных вызовов (`calls_handled`).
- Операторы с критическими ошибками или со сводной -1 из рейтинга исключаются.
- 1–2 место: 2500 / 5000 ₽ (Хор / Макс).
- 3–4 место: 2000 / 4000 ₽.
- 5–6 место: 1500 / 3000 ₽.
- Супервайзеры: 3000 / 6000 ₽ (Хор / Макс), оцениваются отдельно.

### Override

Начальник ИСС может вручную перекрыть любую из трёх производных оценок.
Если override задан — он идёт в сводную, авторасчёт остаётся в отчёте
для сравнения. Причина override обязательна, если задан хотя бы один,
и попадает в лист «Детализация» Excel-экспорта.

### calls_handled

Число обработанных вызовов по каждому оператору за период.
Источник: Fastcom или 1С. Интеграция пока не сделана.

**Временный fallback:** если `calls_handled` = 0, используется число
оценённых звонков (`COUNT evaluations`). Это позволяет строить рейтинг
для отладки, но в реальной работе нужны настоящие цифры из ЦОВ.

## Разработка

Тесты:

    docker compose exec api pytest -q

Миграции:

    docker compose exec api alembic upgrade head
    docker compose exec api alembic revision -m "message" --autogenerate

Логи:

    docker compose logs api --tail=50 -f
    docker compose logs frontend --tail=50 -f

Перезапуск одного сервиса:

    docker compose restart api
    docker compose restart frontend

## Структура

    backend/
    ├── app/
    │   ├── api/              — REST endpoints
    │   │   ├── auth.py
    │   │   ├── operators.py
    │   │   ├── periods.py
    │   │   ├── evaluations.py
    │   │   ├── operator_periods.py
    │   │   ├── supervisor_periods.py
    │   │   ├── scoring.py
    │   │   └── export.py
    │   ├── exporters/
    │   │   └── iss_xlsx.py   — генерация Excel
    │   ├── importers/
    │   │   └── iss_xlsx.py   — парсинг Excel
    │   ├── scoring.py        — правила расчёта (чистые функции)
    │   ├── models.py         — SQLAlchemy-модели
    │   ├── schemas.py        — Pydantic-схемы
    │   ├── cli.py            — CLI-команды
    │   └── main.py           — FastAPI-приложение
    ├── alembic/              — миграции
    ├── data/                 — входные/выходные xlsx (в .gitignore)
    └── tests/                — pytest

    frontend/
    └── src/
        ├── api/              — обёртки над REST
        ├── components/       — переиспользуемые компоненты
        ├── lib/              — хуки и утилиты
        ├── routes/           — страницы
        ├── App.tsx           — роутинг
        └── main.tsx          — точка входа

## Что не сделано

- Управление операторами через UI (сейчас только через API/импорт).
- Управление пользователями через UI.
- Интеграция с Fastcom/1С для `calls_handled`.
- Дашборд SL30/AR/AHT для начальника ИСС.
- Audit log изменений.
- Импорт исторических месяцев (кроме сентября 2026 — он загружен
  как образец).

## История

- Этап 0: каркас, модели, авторизация.
- Этап 1: импортёр `Совместные итоги_Сентябрь.xlsx`.
- Этап 2: REST API для справочников, периодов, оценок.
- Этап 3: правила расчёта (Положение §3.5), override.
- Этап 4: экспорт в Excel.
- Этап 5: CLI `reset-db`, `delete-period`, README.
- Этап 6: фронтенд — логин, периоды, ведомость оператора, дашборд начальника.

