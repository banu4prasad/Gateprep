import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.main import app as fastapi_app
from app.models.models import User, UserRole, Test, Question, QuestionType, TestStatus, TestAttempt
from app.core.security import hash_password, create_access_token
from app.core.config import settings
import secrets

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
def test_data(db_session):
    user = User(email="student@test.com", full_name="Student", hashed_password=hash_password("pass123"), role=UserRole.aspirant, is_active=True)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    test = Test(title="CS Test", duration_minutes=60, total_marks=5.0, is_published=True, created_by=user.id)
    db_session.add(test)
    db_session.commit()
    db_session.refresh(test)
    
    q1 = Question(test_id=test.id, question_type=QuestionType.mcq, question_text="Q1?", options=["a","b","c","d"], correct_answer="B", marks=1.0, negative_marks=0.33, order_index=0)
    q2 = Question(test_id=test.id, question_type=QuestionType.mcq, question_text="Q2?", options=["a","b","c","d"], correct_answer="A", marks=1.0, negative_marks=0.33, order_index=1)
    q3 = Question(test_id=test.id, question_type=QuestionType.msq, question_text="Q3?", options=["a","b","c","d"], correct_answer="A,C", marks=2.0, negative_marks=0.0, order_index=2)
    q4 = Question(test_id=test.id, question_type=QuestionType.nat, question_text="Q4?", options=[], correct_answer="42", marks=1.0, negative_marks=0.0, order_index=3)
    db_session.add_all([q1, q2, q3, q4])
    db_session.commit()
    for q in [q1, q2, q3, q4]: db_session.refresh(q)
    
    return {"user": user, "test": test, "questions": [q1, q2, q3, q4]}

def test_start_test(client, db_session, test_data):
    response = client.post(f"/tests/{test_data['test'].id}/start", cookies=_auth_cookie(test_data['user'], db_session))
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"

def test_get_questions_returns_optimized_cloudinary_images(client, db_session, test_data):
    question = test_data["questions"][0]
    question.question_image_url = (
        "https://res.cloudinary.com/test_cloud/image/upload/v1/question.jpg"
    )
    question.option_images = {
        "A": "https://res.cloudinary.com/test_cloud/image/upload/v1/option_a.jpg",
        "B": "/uploads/option_b.jpg",
    }
    db_session.commit()

    start_resp = client.post(
        f"/tests/{test_data['test'].id}/start",
        cookies=_auth_cookie(test_data["user"], db_session),
    )
    attempt_id = start_resp.json()["id"]

    response = client.get(
        f"/tests/{test_data['test'].id}/attempt/{attempt_id}/questions",
        cookies=_auth_cookie(test_data["user"], db_session),
    )

    assert response.status_code == 200
    first_question = response.json()[0]
    assert (
        first_question["question_image_url"]
        == "https://res.cloudinary.com/test_cloud/image/upload/f_auto,q_auto/v1/question.jpg"
    )
    assert first_question["option_images"] == {
        "A": "https://res.cloudinary.com/test_cloud/image/upload/f_auto,q_auto/v1/option_a.jpg",
        "B": "/uploads/option_b.jpg",
    }

def test_save_answers(client, db_session, test_data):
    start_resp = client.post(f"/tests/{test_data['test'].id}/start", cookies=_auth_cookie(test_data['user'], db_session))
    attempt_id = start_resp.json()["id"]
    
    q1_id = test_data['questions'][0].id
    response = client.post(f"/tests/{test_data['test'].id}/attempt/{attempt_id}/save", json={
        "answers": [{"question_id": q1_id, "selected_answer": "B", "time_spent_seconds": 10}]
    }, cookies=_auth_cookie(test_data['user'], db_session))
    assert response.status_code == 200

def test_submit_correct_mcq_answers(client, db_session, test_data):
    start_resp = client.post(f"/tests/{test_data['test'].id}/start", cookies=_auth_cookie(test_data['user'], db_session))
    attempt_id = start_resp.json()["id"]
    
    q1_id = test_data['questions'][0].id
    response = client.post(f"/tests/{test_data['test'].id}/attempt/{attempt_id}/submit", json={
        "answers": [{"question_id": q1_id, "selected_answer": "B", "time_spent_seconds": 10}]
    }, cookies=_auth_cookie(test_data['user'], db_session))
    
    assert response.status_code == 200
    assert response.json()["score"] == 1.0
    assert response.json()["status"] == "submitted"

def test_submit_wrong_mcq_answers(client, db_session, test_data):
    start_resp = client.post(f"/tests/{test_data['test'].id}/start", cookies=_auth_cookie(test_data['user'], db_session))
    attempt_id = start_resp.json()["id"]
    
    q1_id = test_data['questions'][0].id
    response = client.post(f"/tests/{test_data['test'].id}/attempt/{attempt_id}/submit", json={
        "answers": [{"question_id": q1_id, "selected_answer": "C", "time_spent_seconds": 10}]
    }, cookies=_auth_cookie(test_data['user'], db_session))
    
    assert response.status_code == 200

def test_submit_msq_test(client, db_session, test_data):
    start_resp = client.post(f"/tests/{test_data['test'].id}/start", cookies=_auth_cookie(test_data['user'], db_session))
    attempt_id = start_resp.json()["id"]
    
    q3_id = test_data['questions'][2].id
    response = client.post(f"/tests/{test_data['test'].id}/attempt/{attempt_id}/submit", json={
        "answers": [{"question_id": q3_id, "selected_answer": "A,C", "time_spent_seconds": 10}]
    }, cookies=_auth_cookie(test_data['user'], db_session))
    
    assert response.status_code == 200
    assert response.json()["score"] == 2.0

def test_submit_msq_partial_wrong(client, db_session, test_data):
    start_resp = client.post(f"/tests/{test_data['test'].id}/start", cookies=_auth_cookie(test_data['user'], db_session))
    attempt_id = start_resp.json()["id"]
    
    q3_id = test_data['questions'][2].id
    response = client.post(f"/tests/{test_data['test'].id}/attempt/{attempt_id}/submit", json={
        "answers": [{"question_id": q3_id, "selected_answer": "A", "time_spent_seconds": 10}]
    }, cookies=_auth_cookie(test_data['user'], db_session))
    
    assert response.status_code == 200
    assert response.json()["score"] == 0.0

def test_submit_nat_test(client, db_session, test_data):
    start_resp = client.post(f"/tests/{test_data['test'].id}/start", cookies=_auth_cookie(test_data['user'], db_session))
    attempt_id = start_resp.json()["id"]
    
    q4_id = test_data['questions'][3].id
    response = client.post(f"/tests/{test_data['test'].id}/attempt/{attempt_id}/submit", json={
        "answers": [{"question_id": q4_id, "selected_answer": "42.0", "time_spent_seconds": 10}]
    }, cookies=_auth_cookie(test_data['user'], db_session))
    
    assert response.status_code == 200
    assert response.json()["score"] == 1.0

def test_cannot_submit_already_submitted_test(client, db_session, test_data):
    start_resp = client.post(f"/tests/{test_data['test'].id}/start", cookies=_auth_cookie(test_data['user'], db_session))
    attempt_id = start_resp.json()["id"]
    
    client.post(f"/tests/{test_data['test'].id}/attempt/{attempt_id}/submit", json={"answers": []}, cookies=_auth_cookie(test_data['user'], db_session))
    response = client.post(f"/tests/{test_data['test'].id}/attempt/{attempt_id}/submit", json={"answers": []}, cookies=_auth_cookie(test_data['user'], db_session))
    assert response.status_code == 400

def test_cannot_save_to_submitted_attempt(client, db_session, test_data):
    start_resp = client.post(f"/tests/{test_data['test'].id}/start", cookies=_auth_cookie(test_data['user'], db_session))
    attempt_id = start_resp.json()["id"]
    
    client.post(f"/tests/{test_data['test'].id}/attempt/{attempt_id}/submit", json={"answers": []}, cookies=_auth_cookie(test_data['user'], db_session))
    response = client.post(f"/tests/{test_data['test'].id}/attempt/{attempt_id}/save", json={"answers": []}, cookies=_auth_cookie(test_data['user'], db_session))
    assert response.status_code == 400

def test_test_result_retrieval(client, db_session, test_data):
    start_resp = client.post(f"/tests/{test_data['test'].id}/start", cookies=_auth_cookie(test_data['user'], db_session))
    attempt_id = start_resp.json()["id"]
    
    q1_id = test_data['questions'][0].id
    client.post(f"/tests/{test_data['test'].id}/attempt/{attempt_id}/submit", json={
        "answers": [{"question_id": q1_id, "selected_answer": "B", "time_spent_seconds": 10}]
    }, cookies=_auth_cookie(test_data['user'], db_session))
    
    response = client.get(f"/tests/attempt/{attempt_id}/result", cookies=_auth_cookie(test_data['user'], db_session))
    assert response.status_code == 200
    assert response.json()["score"] == 1.0
