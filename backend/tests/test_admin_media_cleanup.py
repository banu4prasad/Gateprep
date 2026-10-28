from unittest.mock import MagicMock, call

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import require_admin
from app.api.routes.admin import router
from app.api.routes.admin import questions as admin_questions
from app.api.routes.admin import tests as admin_tests
from app.core.database import Base, get_db
from app.models.models import Question, QuestionType, Test, User, UserRole


@pytest.fixture
def admin_client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    db = session_factory()
    try:
        admin = User(
            email="admin@example.com", full_name="Admin", role=UserRole.admin
        )
        test = Test(title="Media cleanup", created_by=1, total_marks=0.0)
        db.add_all([admin, test])
        db.commit()
        db.refresh(test)
        test_id = test.id
    finally:
        db.close()

    app = FastAPI()
    app.include_router(router)

    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_admin] = lambda: admin
    try:
        yield TestClient(app), session_factory, test_id
    finally:
        engine.dispose()


def _question(test_id: int, text: str, **kwargs) -> Question:
    question_data = {
        "test_id": test_id,
        "question_type": QuestionType.mcq,
        "question_text": text,
        "options": ["A", "B", "C", "D"],
        "correct_answer": "A",
        "marks": 1.0,
        "negative_marks": 0.33,
        "order_index": 0,
    }
    question_data.update(kwargs)
    return Question(**question_data)


def test_delete_question_removes_primary_and_option_cloudinary_images(
    admin_client, monkeypatch
):
    client, session_factory, test_id = admin_client
    db = session_factory()
    question = _question(
        test_id,
        "Question with images",
        question_image_id="folder/question-primary",
        option_images={
            "A": "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v123/folder/option-a.png",
            "B": "/uploads/local-option.png",
        },
    )
    db.add(question)
    db.commit()
    question_id = question.id
    db.close()

    delete_image = MagicMock()
    monkeypatch.setattr(admin_questions, "delete_image", delete_image)

    response = client.delete(f"/admin/tests/{test_id}/questions/{question_id}")

    assert response.status_code == 200
    assert delete_image.call_args_list == [
        call("folder/question-primary"),
        call("folder/option-a"),
    ]


def test_delete_test_removes_all_question_and_option_cloudinary_images(
    admin_client, monkeypatch
):
    client, session_factory, test_id = admin_client
    db = session_factory()
    db.add_all(
        [
            _question(
                test_id,
                "First question",
                question_image_id="folder/question-one",
                option_images={
                    "A": "https://res.cloudinary.com/demo/image/upload/v123/folder/option-one.jpg"
                },
            ),
            _question(
                test_id,
                "Second question",
                order_index=1,
                question_image_id=None,
                option_images={
                    "B": "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v456/folder/option-two.webp"
                },
            ),
        ]
    )
    db.commit()
    db.close()

    delete_image = MagicMock()
    monkeypatch.setattr(admin_tests, "delete_image", delete_image, raising=False)

    response = client.delete(f"/admin/tests/{test_id}")

    assert response.status_code == 200
    assert {image_call.args[0] for image_call in delete_image.call_args_list} == {
        "folder/question-one",
        "folder/option-one",
        "folder/option-two",
    }
