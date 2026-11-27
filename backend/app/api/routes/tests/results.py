import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.models import Test, TestAttempt, TestStatus
from app.api.routes.tests.helpers import (
    MAX_REATTEMPTS,
    _attempt_progress,
    _submitted_attempts_query,
)
from app.api.routes.tests.result_builder import (
    _attempt_answer_details,
    _evaluate_submission,
    _result_payload,
)
from app.api.routes.tests.schemas import (
    PersistedResultResponse,
    PracticeResultHtmlRequest,
)
from app.services.html_report_service import generate_result_html

router = APIRouter()


def _load_attempt_result(attempt_id: int, current_user, db: Session) -> dict:
    attempt = (
        db.query(TestAttempt)
        .options(
            joinedload(TestAttempt.test).selectinload(Test.questions),
            selectinload(TestAttempt.answers),
        )
        .filter(TestAttempt.id == attempt_id, TestAttempt.user_id == current_user.id)
        .first()
    )
    if not attempt or attempt.status != TestStatus.submitted:
        raise HTTPException(status_code=404, detail="Result not found")

    test = attempt.test
    # Only ids are needed to derive attempt_number and the submitted count.
    submitted_ids = (
        _submitted_attempts_query(db, current_user.id, test.id)
        .with_entities(TestAttempt.id)
        .order_by(TestAttempt.id.asc())
        .all()
    )
    attempt_number = next(
        (i + 1 for i, row in enumerate(submitted_ids) if row.id == attempt_id), 1
    )
    is_first = attempt_number == 1

    progress = _attempt_progress(db, current_user.id, test.id, len(submitted_ids))
    total_marks = attempt.total_marks or sum(q.marks for q in test.questions)

    return _result_payload(
        attempt_id=attempt_id,
        client_result_id=None,
        attempt_number=attempt_number,
        attempts_remaining=max(0, MAX_REATTEMPTS + 1 - progress["total_used"]),
        counts_for_leaderboard=is_first,
        persisted=True,
        test=test,
        score=attempt.score or 0,
        total_marks=total_marks,
        submitted_at=attempt.submitted_at,
        tab_violations=attempt.tab_violations,
        answer_details=_attempt_answer_details(test, attempt.answers),
        current_user=current_user,
        db=db,
    )


def _build_html_response(payload: dict) -> Response:
    html = generate_result_html(payload)
    test_title = payload.get("test_title") or "result"
    slug = re.sub(r"[^a-z0-9]+", "-", test_title.lower()).strip("-")
    filename = f"{slug or 'test'}-result.html"
    return Response(
        content=html,
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )


@router.get("/attempt/{attempt_id}/result", response_model=PersistedResultResponse)
def get_result(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return _load_attempt_result(attempt_id, current_user, db)


@router.get("/attempt/{attempt_id}/result.html")
def get_result_html(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    payload = _load_attempt_result(attempt_id, current_user, db)
    return _build_html_response(payload)


@router.post("/practice/result.html")
def post_practice_result_html(
    body: PracticeResultHtmlRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Render a downloadable report for a practice (non-persisted) attempt.

    The test is re-hydrated from the database and the submitted answers are
    re-scored, so no question content or score is trusted from the client. The
    caller must already hold a persisted submission for the test, otherwise this
    route would let anyone scrape the answer key for tests they have not taken.
    """
    test = (
        db.query(Test)
        .options(selectinload(Test.questions))
        .filter(Test.id == body.test_id, Test.is_published.is_(True))
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    previous_submission_count = _submitted_attempts_query(
        db, current_user.id, test.id
    ).count()
    if previous_submission_count == 0:
        raise HTTPException(
            status_code=403,
            detail="Complete a standard attempt before downloading practice reports",
        )

    score, total_marks, answer_details = _evaluate_submission(test, body.answers)
    client_result_id = body.client_result_id or f"practice-{test.id}"

    payload = _result_payload(
        attempt_id=client_result_id,
        client_result_id=client_result_id,
        attempt_number=body.attempt_number,
        attempts_remaining=body.attempts_remaining,
        counts_for_leaderboard=False,
        persisted=False,
        test=test,
        score=score,
        total_marks=total_marks,
        submitted_at=body.submitted_at or datetime.now(timezone.utc),
        tab_violations=body.tab_violations,
        answer_details=answer_details,
        current_user=current_user,
        db=db,
    )
    return _build_html_response(payload)
