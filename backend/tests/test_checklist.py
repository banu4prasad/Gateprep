import pytest
import secrets
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app as fastapi_app
from app.models.models import User, UserRole, ChecklistSubject, ChecklistTopic, ChecklistProgress
from app.api.routes.checklist import CHECKLIST_ITEMS
from app.core.security import create_access_token
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

def _auth_cookie(user, db_session):
    session_id = secrets.token_hex(32)
    user.current_session_id = session_id
    db_session.commit()
    token = create_access_token({"sub": str(user.id), "role": user.role.value if hasattr(user.role, 'value') else user.role, "sid": session_id, "auth": "cookie"})
    return {settings.AUTH_COOKIE_NAME: token}

@pytest.fixture
def admin_user(db_session):
    user = User(email="admin_chk@test.com", hashed_password="pw", role=UserRole.admin, full_name="Admin User")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def aspirant_user(db_session):
    user = User(email="aspirant_chk@test.com", hashed_password="pw", role=UserRole.aspirant, full_name="Aspirant User")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def sample_checklist(db_session, admin_user):
    s1 = ChecklistSubject(name="Math", order_index=1, created_by=admin_user.id)
    db_session.add(s1)
    db_session.commit()
    db_session.refresh(s1)
    
    t1 = ChecklistTopic(subject_id=s1.id, name="Algebra", order_index=1)
    t2 = ChecklistTopic(subject_id=s1.id, name="Calculus", order_index=2)
    db_session.add_all([t1, t2])
    db_session.commit()
    db_session.refresh(t1)
    db_session.refresh(t2)
    
    return {"subject": s1, "topics": [t1, t2]}

def test_get_checklist_unauthenticated(client, db_session, sample_checklist):
    resp = client.get("/checklist")
    assert resp.status_code == 200
    data = resp.json()
    assert "subjects" in data
    assert len(data["subjects"]) == 1
    
    subj = data["subjects"][0]
    assert subj["name"] == "Math"
    assert len(subj["topics"]) == 2
    
    # Progress should be empty for unauthenticated user
    topic1 = subj["topics"][0]
    assert topic1["completed_items"] == {}
    assert topic1["percentage"] == 0

def test_get_checklist_authenticated(client, db_session, sample_checklist, aspirant_user):
    topic1 = sample_checklist["topics"][0]
    
    # Add some progress manually
    progress = ChecklistProgress(user_id=aspirant_user.id, topic_id=topic1.id, completed_items={"theory": True, "pyq_1": True})
    db_session.add(progress)
    db_session.commit()
    
    resp = client.get("/checklist", cookies=_auth_cookie(aspirant_user, db_session))
    assert resp.status_code == 200
    data = resp.json()
    
    subj = data["subjects"][0]
    t1 = next(t for t in subj["topics"] if t["id"] == topic1.id)
    assert t1["completed_items"].get("theory") is True
    assert t1["done_count"] == 2

def test_update_progress(client, db_session, sample_checklist, aspirant_user):
    topic1 = sample_checklist["topics"][0]
    
    payload = {"item": "theory", "completed": True}
    resp = client.post(f"/checklist/{topic1.id}/progress", json=payload, cookies=_auth_cookie(aspirant_user, db_session))
    
    assert resp.status_code == 200
    data = resp.json()
    assert data["topic_id"] == topic1.id
    assert data["completed_items"].get("theory") is True
    assert data["done_count"] == 1
    
    # Update progress again to remove
    payload = {"item": "theory", "completed": False}
    resp2 = client.post(f"/checklist/{topic1.id}/progress", json=payload, cookies=_auth_cookie(aspirant_user, db_session))
    assert resp2.status_code == 200
    assert resp2.json()["completed_items"].get("theory") is False
    assert resp2.json()["done_count"] == 0

def test_update_progress_invalid_item(client, db_session, sample_checklist, aspirant_user):
    topic1 = sample_checklist["topics"][0]
    payload = {"item": "invalid_item", "completed": True}
    resp = client.post(f"/checklist/{topic1.id}/progress", json=payload, cookies=_auth_cookie(aspirant_user, db_session))
    assert resp.status_code == 400

def test_update_progress_not_found(client, db_session, aspirant_user):
    payload = {"item": "theory", "completed": True}
    resp = client.post("/checklist/999/progress", json=payload, cookies=_auth_cookie(aspirant_user, db_session))
    assert resp.status_code == 404

def test_create_subject(client, db_session, admin_user):
    payload = {"name": "Physics", "order_index": 2}
    resp = client.post("/checklist/subjects", json=payload, cookies=_auth_cookie(admin_user, db_session))
    assert resp.status_code == 201
    assert resp.json()["name"] == "Physics"

def test_create_subject_non_admin(client, db_session, aspirant_user):
    payload = {"name": "Physics", "order_index": 2}
    resp = client.post("/checklist/subjects", json=payload, cookies=_auth_cookie(aspirant_user, db_session))
    assert resp.status_code == 403

def test_delete_subject(client, db_session, sample_checklist, admin_user):
    subject_id = sample_checklist["subject"].id
    resp = client.delete(f"/checklist/subjects/{subject_id}", cookies=_auth_cookie(admin_user, db_session))
    assert resp.status_code == 200
    assert db_session.query(ChecklistSubject).filter_by(id=subject_id).first() is None

def test_delete_subject_not_found(client, db_session, admin_user):
    resp = client.delete("/checklist/subjects/999", cookies=_auth_cookie(admin_user, db_session))
    assert resp.status_code == 404

def test_create_topic(client, db_session, sample_checklist, admin_user):
    subject_id = sample_checklist["subject"].id
    payload = {"name": "Geometry", "order_index": 3}
    resp = client.post(f"/checklist/subjects/{subject_id}/topics", json=payload, cookies=_auth_cookie(admin_user, db_session))
    assert resp.status_code == 201
    assert resp.json()["name"] == "Geometry"

def test_create_topic_subject_not_found(client, db_session, admin_user):
    payload = {"name": "Geometry", "order_index": 3}
    resp = client.post("/checklist/subjects/999/topics", json=payload, cookies=_auth_cookie(admin_user, db_session))
    assert resp.status_code == 404

def test_delete_topic(client, db_session, sample_checklist, admin_user):
    topic_id = sample_checklist["topics"][0].id
    resp = client.delete(f"/checklist/topics/{topic_id}", cookies=_auth_cookie(admin_user, db_session))
    assert resp.status_code == 200
    assert db_session.query(ChecklistTopic).filter_by(id=topic_id).first() is None

def test_delete_topic_not_found(client, db_session, admin_user):
    resp = client.delete("/checklist/topics/999", cookies=_auth_cookie(admin_user, db_session))
    assert resp.status_code == 404
