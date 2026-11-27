import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import secrets

from app.core.database import Base, get_db
from app.main import app as fastapi_app
from app.models.models import (
    User,
    UserRole,
    Test,
    Question,
    QuestionType,
    TestAttempt,
)
from app.core.security import hash_password, create_access_token
from app.core.config import settings
from app.services.html_report_service import _format_datetime


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
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
    token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role.value if hasattr(user.role, "value") else user.role,
            "sid": session_id,
            "auth": "cookie",
        }
    )
    return {settings.AUTH_COOKIE_NAME: token}


@pytest.fixture
def test_setup(db_session):
    user1 = User(
        email="student1@test.com",
        full_name="Student One",
        hashed_password=hash_password("pass123"),
        role=UserRole.aspirant,
        is_active=True,
    )
    user2 = User(
        email="student2@test.com",
        full_name="Student Two",
        hashed_password=hash_password("pass123"),
        role=UserRole.aspirant,
        is_active=True,
    )
    db_session.add_all([user1, user2])
    db_session.commit()
    db_session.refresh(user1)
    db_session.refresh(user2)

    test = Test(
        title="Algorithms & Math CS Test",
        duration_minutes=60,
        total_marks=4.0,
        is_published=True,
        created_by=user1.id,
    )
    db_session.add(test)
    db_session.commit()
    db_session.refresh(test)

    q1 = Question(
        test_id=test.id,
        question_type=QuestionType.mcq,
        question_text="What is $O(n \\log n)$ time complexity?",
        options=["Linear", "Log-linear", "Quadratic", "Exponential"],
        correct_answer="B",
        marks=1.0,
        negative_marks=0.33,
        order_index=0,
    )
    q2 = Question(
        test_id=test.id,
        question_type=QuestionType.nat,
        question_text="Evaluate $\\sum_{i=1}^{3} i$",
        options=[],
        correct_answer="6",
        marks=2.0,
        negative_marks=0.0,
        order_index=1,
    )
    db_session.add_all([q1, q2])
    db_session.commit()
    for q in [q1, q2]:
        db_session.refresh(q)

    return {
        "user1": user1,
        "user2": user2,
        "test": test,
        "questions": [q1, q2],
    }


def test_katex_version_parity():
    """
    Ensure the committed inlined KaTeX asset version matches frontend/package.json,
    preventing silent version drift.
    """
    repo_root = Path(__file__).resolve().parent.parent.parent
    pkg_path = repo_root / "frontend" / "package.json"
    katex_css_path = repo_root / "backend" / "app" / "static" / "katex" / "katex-inline.css"

    assert pkg_path.exists(), "frontend/package.json must exist"
    assert katex_css_path.exists(), "backend/app/static/katex/katex-inline.css must exist"

    pkg_data = json.loads(pkg_path.read_text(encoding="utf-8"))
    raw_version = pkg_data.get("dependencies", {}).get("katex", "0.17.0")
    clean_version = raw_version.lstrip("^~")

    content = katex_css_path.read_text(encoding="utf-8")
    first_line = content.split("\n", 1)[0]
    expected_header = f"/* KaTeX v{clean_version} (inlined fonts) */"
    assert first_line == expected_header, (
        f"KaTeX asset version mismatch! Found '{first_line}', expected '{expected_header}'. "
        f"Run `node scripts/build-katex-inline.mjs` to synchronize."
    )

    # Ensure zero relative URLs remain (all fonts must be data:font/woff2;base64)
    import re
    relative_urls = re.findall(r"url\((?!['\"]?data:)[^)]+\)", content)
    assert relative_urls == [], f"Found non-inlined relative URLs in KaTeX CSS: {relative_urls}"


def test_get_result_html_success(client, db_session, test_setup):
    user1 = test_setup["user1"]
    test = test_setup["test"]
    q1, q2 = test_setup["questions"]
    cookies = _auth_cookie(user1, db_session)

    # 1. Start test
    start_resp = client.post(f"/tests/{test.id}/start", cookies=cookies)
    assert start_resp.status_code == 200
    attempt_id = start_resp.json()["id"]

    # 2. Submit test
    submit_payload = {
        "answers": [
            {"question_id": q1.id, "selected_answer": "B", "time_spent_seconds": 30},
            {"question_id": q2.id, "selected_answer": "6", "time_spent_seconds": 45},
        ]
    }
    submit_resp = client.post(
        f"/tests/{test.id}/attempt/{attempt_id}/submit",
        json=submit_payload,
        cookies=cookies,
    )
    assert submit_resp.status_code == 200

    # 3. Request result HTML report
    resp = client.get(f"/tests/attempt/{attempt_id}/result.html", cookies=cookies)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/html")
    assert resp.headers["content-disposition"] == 'attachment; filename="algorithms-math-cs-test-result.html"'

    body = resp.text
    # Check document structure and branding
    assert "<!DOCTYPE html>" in body
    assert "Algorithms &amp; Math CS Test" in body
    assert "Gateprep Result Report" in body

    # Check KaTeX assets and scripts are inlined
    assert "renderMathInElement" in body
    assert "KaTeX_Main" in body or "data:font/woff2;base64" in body

    # Check question content and review details
    assert "What is $O(n \\log n)$ time complexity?" in body
    assert "Log-linear" in body
    assert "Evaluate $\\sum_{i=1}^{3} i$" in body
    assert "Generated by Gateprep on" in body


def test_get_result_html_not_found(client, db_session, test_setup):
    cookies = _auth_cookie(test_setup["user1"], db_session)
    resp = client.get("/tests/attempt/999999/result.html", cookies=cookies)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Result not found"


def test_get_result_html_unauthorized(client, test_setup):
    resp = client.get("/tests/attempt/1/result.html")
    assert resp.status_code == 401


def test_get_result_html_other_user_attempt_not_found(client, db_session, test_setup):
    """
    Ensure accessing another user's attempt returns 404 'Result not found' on both
    the JSON result endpoint and the HTML result report endpoint, preventing
    enumeration of other users' attempts.
    """
    user1 = test_setup["user1"]
    user2 = test_setup["user2"]
    test = test_setup["test"]
    q1 = test_setup["questions"][0]

    # User 1 starts and submits attempt
    cookies1 = _auth_cookie(user1, db_session)
    start_resp = client.post(f"/tests/{test.id}/start", cookies=cookies1)
    attempt_id = start_resp.json()["id"]

    client.post(
        f"/tests/{test.id}/attempt/{attempt_id}/submit",
        json={"answers": [{"question_id": q1.id, "selected_answer": "B", "time_spent_seconds": 10}]},
        cookies=cookies1,
    )

    # User 2 attempts to fetch User 1's result via JSON and HTML endpoints
    cookies2 = _auth_cookie(user2, db_session)

    # 1. JSON endpoint check
    json_resp = client.get(f"/tests/attempt/{attempt_id}/result", cookies=cookies2)
    assert json_resp.status_code == 404
    assert json_resp.json()["detail"] == "Result not found"

    # 2. HTML endpoint check
    html_resp = client.get(f"/tests/attempt/{attempt_id}/result.html", cookies=cookies2)
    assert html_resp.status_code == 404
    assert html_resp.json()["detail"] == "Result not found"


# ---------------------------------------------------------------------------
# GET /result.html response headers
# ---------------------------------------------------------------------------


def _submit_first_attempt(client, cookies, test, questions, answers=None):
    """Start + submit a standard (first) attempt and return its attempt id."""
    start_resp = client.post(f"/tests/{test.id}/start", cookies=cookies)
    assert start_resp.status_code == 200
    attempt_id = start_resp.json()["id"]
    q1, q2 = questions
    payload = {
        "answers": answers
        if answers is not None
        else [
            {"question_id": q1.id, "selected_answer": "B", "time_spent_seconds": 30},
            {"question_id": q2.id, "selected_answer": "6", "time_spent_seconds": 45},
        ]
    }
    submit_resp = client.post(
        f"/tests/{test.id}/attempt/{attempt_id}/submit", json=payload, cookies=cookies
    )
    assert submit_resp.status_code == 200
    return attempt_id


def test_get_result_html_security_headers(client, db_session, test_setup):
    cookies = _auth_cookie(test_setup["user1"], db_session)
    attempt_id = _submit_first_attempt(
        client, cookies, test_setup["test"], test_setup["questions"]
    )

    resp = client.get(f"/tests/attempt/{attempt_id}/result.html", cookies=cookies)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/html; charset=utf-8"
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert resp.headers["cache-control"] == "private, no-store"


# ---------------------------------------------------------------------------
# POST /tests/practice/result.html
# ---------------------------------------------------------------------------


def _practice_body(test, questions, **overrides):
    q1, q2 = questions
    body = {
        "test_id": test.id,
        "answers": [
            {"question_id": q1.id, "selected_answer": "A", "time_spent_seconds": 12},
            {"question_id": q2.id, "selected_answer": "6", "time_spent_seconds": 20},
        ],
        "client_result_id": "practice-77",
        "attempt_number": 2,
        "attempts_remaining": 4,
        "submitted_at": "2026-06-23T12:00:00Z",
        "tab_violations": 0,
    }
    body.update(overrides)
    return body


def test_practice_result_html_success_rehydrates_from_db(client, db_session, test_setup):
    user1 = test_setup["user1"]
    test = test_setup["test"]
    cookies = _auth_cookie(user1, db_session)
    _submit_first_attempt(client, cookies, test, test_setup["questions"])

    resp = client.post(
        "/tests/practice/result.html",
        json=_practice_body(test, test_setup["questions"]),
        cookies=cookies,
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/html; charset=utf-8"
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert resp.headers["cache-control"] == "private, no-store"
    assert (
        resp.headers["content-disposition"]
        == 'attachment; filename="algorithms-math-cs-test-result.html"'
    )

    body = resp.text
    assert "<!DOCTYPE html>" in body
    # Content comes from PostgreSQL/SQLite, not from the request body.
    assert "Algorithms &amp; Math CS Test" in body
    assert "What is $O(n \\log n)$ time complexity?" in body
    assert "Log-linear" in body
    # Re-scored server-side: q1 wrong (-0.33) + q2 correct (+2) = 1.67 / 3.0.
    assert "1.67 / 3.0" in body
    # KaTeX stays inlined for offline viewing.
    assert "renderMathInElement" in body


def test_practice_result_html_ignores_client_supplied_content(client, db_session, test_setup):
    """Extra fields (question text, correct answer, score) in the body are not
    part of the schema and must never reach the rendered report."""
    user1 = test_setup["user1"]
    test = test_setup["test"]
    cookies = _auth_cookie(user1, db_session)
    _submit_first_attempt(client, cookies, test, test_setup["questions"])

    body = _practice_body(test, test_setup["questions"])
    body.update(
        {
            "score": 999,
            "test_title": "FORGED TITLE",
            "questions": [{"question_text": "FORGED QUESTION", "correct_answer": "A"}],
        }
    )
    resp = client.post("/tests/practice/result.html", json=body, cookies=cookies)
    assert resp.status_code == 200
    assert "FORGED" not in resp.text
    # "999" alone can appear inside the inlined base64 fonts, so check the
    # rendered score instead; the server-computed score is 1.67 / 3.0.
    assert "999.00" not in resp.text
    assert "1.67 / 3.0" in resp.text
    assert "Algorithms &amp; Math CS Test" in resp.text


def test_practice_result_html_escapes_answer_text(client, db_session, test_setup):
    user1 = test_setup["user1"]
    test = test_setup["test"]
    q1, q2 = test_setup["questions"]
    cookies = _auth_cookie(user1, db_session)
    _submit_first_attempt(client, cookies, test, test_setup["questions"])

    xss = "<script>alert(1)</script>"
    body = _practice_body(
        test,
        test_setup["questions"],
        answers=[{"question_id": q2.id, "selected_answer": xss, "time_spent_seconds": 1}],
    )
    resp = client.post("/tests/practice/result.html", json=body, cookies=cookies)
    assert resp.status_code == 200
    assert xss not in resp.text
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in resp.text


def test_practice_result_html_ignores_unknown_question_ids(client, db_session, test_setup):
    user1 = test_setup["user1"]
    test = test_setup["test"]
    cookies = _auth_cookie(user1, db_session)
    _submit_first_attempt(client, cookies, test, test_setup["questions"])

    body = _practice_body(
        test,
        test_setup["questions"],
        answers=[{"question_id": 987654, "selected_answer": "B", "time_spent_seconds": 1}],
    )
    resp = client.post("/tests/practice/result.html", json=body, cookies=cookies)
    assert resp.status_code == 200
    assert "0.00 / 3.0" in resp.text


def test_practice_result_html_requires_prior_submission(client, db_session, test_setup):
    """A user who has not completed a standard attempt must not be able to scrape
    the answer key by posting an empty answer list."""
    test = test_setup["test"]
    cookies = _auth_cookie(test_setup["user2"], db_session)

    resp = client.post(
        "/tests/practice/result.html",
        json={"test_id": test.id, "answers": []},
        cookies=cookies,
    )
    assert resp.status_code == 403
    assert (
        resp.json()["detail"]
        == "Complete a standard attempt before downloading practice reports"
    )


def test_practice_result_html_prior_submission_is_per_user(client, db_session, test_setup):
    """user1's submission must not unlock the report for user2."""
    test = test_setup["test"]
    cookies1 = _auth_cookie(test_setup["user1"], db_session)
    _submit_first_attempt(client, cookies1, test, test_setup["questions"])

    cookies2 = _auth_cookie(test_setup["user2"], db_session)
    resp = client.post(
        "/tests/practice/result.html",
        json={"test_id": test.id, "answers": []},
        cookies=cookies2,
    )
    assert resp.status_code == 403


def test_practice_result_html_unpublished_test_not_found(client, db_session, test_setup):
    test = test_setup["test"]
    cookies = _auth_cookie(test_setup["user1"], db_session)
    _submit_first_attempt(client, cookies, test, test_setup["questions"])

    test.is_published = False
    db_session.commit()

    resp = client.post(
        "/tests/practice/result.html",
        json=_practice_body(test, test_setup["questions"]),
        cookies=cookies,
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Test not found"


def test_practice_result_html_missing_test_not_found(client, db_session, test_setup):
    cookies = _auth_cookie(test_setup["user1"], db_session)
    resp = client.post(
        "/tests/practice/result.html",
        json={"test_id": 999999, "answers": []},
        cookies=cookies,
    )
    assert resp.status_code == 404


def test_practice_result_html_unauthorized(client, test_setup):
    resp = client.post(
        "/tests/practice/result.html",
        json={"test_id": test_setup["test"].id, "answers": []},
    )
    assert resp.status_code == 401


@pytest.mark.parametrize(
    "overrides",
    [
        {"attempt_number": 0},
        {"attempts_remaining": -1},
        {"tab_violations": -1},
        {"client_result_id": "x" * 65},
        {"answers": [{"question_id": 1, "time_spent_seconds": -5}]},
        {"answers": [{"question_id": i} for i in range(501)]},
    ],
)
def test_practice_result_html_validates_request(client, db_session, test_setup, overrides):
    test = test_setup["test"]
    cookies = _auth_cookie(test_setup["user1"], db_session)
    body = {"test_id": test.id, "answers": []}
    body.update(overrides)
    resp = client.post("/tests/practice/result.html", json=body, cookies=cookies)
    assert resp.status_code == 422


def test_practice_result_html_converts_offset_submitted_at_to_utc(
    client, db_session, test_setup
):
    test = test_setup["test"]
    cookies = _auth_cookie(test_setup["user1"], db_session)
    _submit_first_attempt(client, cookies, test, test_setup["questions"])

    resp = client.post(
        "/tests/practice/result.html",
        json=_practice_body(
            test, test_setup["questions"], submitted_at="2026-06-23T12:00:00+05:30"
        ),
        cookies=cookies,
    )
    assert resp.status_code == 200
    assert "23 Jun 2026, 06:30 AM UTC" in resp.text


# ---------------------------------------------------------------------------
# _format_datetime
# ---------------------------------------------------------------------------


def test_format_datetime_converts_aware_values_to_utc():
    ist = timezone(timedelta(hours=5, minutes=30))
    aware = datetime(2026, 6, 23, 12, 0, tzinfo=ist)
    assert _format_datetime(aware) == "23 Jun 2026, 06:30 AM UTC"
    assert _format_datetime("2026-06-23T12:00:00+05:30") == "23 Jun 2026, 06:30 AM UTC"
    assert _format_datetime("2026-06-23T12:00:00Z") == "23 Jun 2026, 12:00 PM UTC"


def test_format_datetime_leaves_naive_values_and_empty_alone():
    assert _format_datetime(datetime(2026, 6, 23, 12, 0)) == "23 Jun 2026, 12:00 PM UTC"
    assert _format_datetime(None) == "-"
    assert _format_datetime("not-a-date") == "not-a-date"
