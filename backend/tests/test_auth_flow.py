import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.main import app as fastapi_app
from app.models.models import User, UserRole
from app.core.security import hash_password, create_access_token
from app.core.config import settings

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def client(db_session):
    def override():
        try:
            yield db_session
        finally:
            pass
    fastapi_app.dependency_overrides[get_db] = override
    with TestClient(fastapi_app, base_url="https://testserver") as c:
        yield c
    fastapi_app.dependency_overrides.clear()

def test_register_first_user_becomes_admin(client, db_session):
    response = client.post("/auth/register", json={
        "email": "admin@test.com",
        "full_name": "Admin User",
        "password": "password123"
    })
    assert response.status_code == 200
    assert response.json()["role"] == UserRole.admin.value

def test_register_second_user_becomes_user(client, db_session):
    client.post("/auth/register", json={"email": "first@test.com", "full_name": "First", "password": "password123"})
    response = client.post("/auth/register", json={
        "email": "user@test.com",
        "full_name": "Regular User",
        "password": "password123"
    })
    assert response.status_code == 200
    assert response.json()["role"] == UserRole.user.value

def test_login_successful(client, db_session):
    client.post("/auth/register", json={"email": "test@test.com", "full_name": "Test", "password": "password123"})
    response = client.post("/auth/login", json={"email": "test@test.com", "password": "password123"})
    assert response.status_code == 200
    assert "access_token" in response.cookies

def test_login_wrong_password(client, db_session):
    client.post("/auth/register", json={"email": "test@test.com", "full_name": "Test", "password": "password123"})
    response = client.post("/auth/login", json={"email": "test@test.com", "password": "wrongpassword"})
    assert response.status_code == 401

def test_login_inactive_user(client, db_session):
    user = User(email="inactive@test.com", full_name="Inactive", hashed_password=hash_password("password123"), role=UserRole.user, is_active=False)
    db_session.add(user)
    db_session.commit()
    response = client.post("/auth/login", json={"email": "inactive@test.com", "password": "password123"})
    assert response.status_code == 403

def test_protected_route_access(client, db_session):
    client.post("/auth/register", json={"email": "test@test.com", "full_name": "Test", "password": "password123"})
    client.post("/auth/login", json={"email": "test@test.com", "password": "password123"})
    response = client.get("/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == "test@test.com"

def test_protected_route_without_cookie(client, db_session):
    response = client.get("/auth/me")
    assert response.status_code == 401

def test_logout_flow(client, db_session):
    client.post("/auth/register", json={"email": "test@test.com", "full_name": "Test", "password": "password123"})
    client.post("/auth/login", json={"email": "test@test.com", "password": "password123"})
    response = client.post("/auth/logout")
    assert response.status_code == 200
    me_response = client.get("/auth/me")
    assert me_response.status_code == 401
    
def test_stale_session_is_rejected(client, db_session):
    user = User(email="stale@test.com", full_name="Stale", hashed_password=hash_password("password123"), role=UserRole.user, is_active=True, current_session_id="session-A")
    db_session.add(user)
    db_session.commit()
    token = create_access_token({"sub": str(user.id), "role": user.role.value, "sid": "session-B", "auth": "cookie"})
    client.cookies.set(settings.AUTH_COOKIE_NAME, token)
    response = client.get("/auth/me")
    assert response.status_code == 401
