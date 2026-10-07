import os

# Жёстко перекрываем переменные окружения ДО импорта приложения,
# чтобы app.db не пытался коннектиться к продовой БД.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.deps import get_db
from app.main import app


@pytest.fixture
def test_engine():
    """Свежий in-memory SQLite с уже созданными таблицами на каждый тест."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def db_session(test_engine):
    """Сессия для посева данных в тестах. Отдельная от клиента,
    но на том же engine — данные видны обоим."""
    Session = sessionmaker(test_engine, autoflush=False, expire_on_commit=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(test_engine):
    """TestClient с переопределённым get_db на тот же engine."""
    Session = sessionmaker(test_engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
