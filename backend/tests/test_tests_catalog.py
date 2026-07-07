from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app as fastapi_app
from app.models.models import Question, QuestionType, Test, User, UserRole


def _make_client(db_session):
    def override():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override
    return TestClient(fastapi_app, base_url="https://testserver")


def _make_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()


def test_list_tests_allows_regular_user():
    db_session = _make_session()
    try:
        with _make_client(db_session) as client:
            user = User(
                email="user@test.com",
                full_name="Regular User",
                hashed_password=hash_password("pass123"),
                role=UserRole.user,
                is_active=True,
            )
            db_session.add(user)
            db_session.commit()
            db_session.refresh(user)

            login_response = client.post(
                "/auth/login",
                json={"email": "user@test.com", "password": "pass123"},
            )
            assert login_response.status_code == 200

            published = Test(
                title="Published Test",
                duration_minutes=60,
                total_marks=10.0,
                is_published=True,
                created_by=user.id,
            )
            unpublished = Test(
                title="Hidden Test",
                duration_minutes=60,
                total_marks=10.0,
                is_published=False,
                created_by=user.id,
            )
            db_session.add_all([published, unpublished])
            db_session.commit()
            db_session.refresh(published)
            db_session.refresh(unpublished)

            db_session.add(
                Question(
                    test_id=published.id,
                    question_type=QuestionType.mcq,
                    question_text="Q1?",
                    options=["A", "B", "C", "D"],
                    correct_answer="A",
                    marks=1.0,
                    negative_marks=0.33,
                    order_index=0,
                )
            )
            db_session.commit()

            response = client.get("/tests")

            assert response.status_code == 200
            data = response.json()
            assert [item["title"] for item in data] == ["Published Test"]
            assert data[0]["question_count"] == 1
    finally:
        fastapi_app.dependency_overrides.clear()
        db_session.close()