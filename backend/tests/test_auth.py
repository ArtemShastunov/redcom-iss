from app.models import User, UserRole
from app.security import hash_password


def _seed(db_session, login="admin", password="secret", role=UserRole.ADMIN):
    db_session.add(User(
        login=login,
        password_hash=hash_password(password),
        full_name="Admin",
        role=role,
    ))
    db_session.commit()


def test_login_logout_me(client, db_session):
    _seed(db_session)

    r = client.post("/api/auth/login", json={"login": "admin", "password": "secret"})
    assert r.status_code == 200, r.text
    assert r.json()["login"] == "admin"
    assert r.json()["role"] == "admin"

    r = client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["login"] == "admin"

    r = client.post("/api/auth/logout")
    assert r.status_code == 200

    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_login_bad_password(client, db_session):
    _seed(db_session)
    r = client.post("/api/auth/login", json={"login": "admin", "password": "wrong"})
    assert r.status_code == 401


def test_me_without_cookie(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401
