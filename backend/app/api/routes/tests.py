from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, aliased, joinedload
from sqlalchemy import func
from pydantic import BaseModel
from fastapi_cache.decorator import cache
from app.core.database import get_db
from app.api.deps import require_aspirant, get_current_user
from app.models.models import (
    PracticeAttemptCounter,
    Question,
    Test,
    TestAttempt,
    TestStatus,
    UserAnswer,
)
from app.services.scoring import evaluate_answer

router = APIRouter(prefix="/tests", tags=["Tests"])

MAX_REATTEMPTS = 5  # max reattempts per test (6 total including first)


# ── Schemas ───────────────────────────────────────────────────────

class AnswerSubmit(BaseModel):
    question_id: int
    selected_answer: Optional[str] = None
    time_spent_seconds: int = 0

class BulkAnswerSubmit(BaseModel):
    answers: List[AnswerSubmit]

class ViolationUpdate(BaseModel):
    tab_violations: Optional[int] = None
    fullscreen_violations: Optional[int] = None


def _submitted_attempts_query(db: Session, user_id: int, test_id: int):
    return db.query(TestAttempt).filter(
        TestAttempt.user_id == user_id,
        TestAttempt.test_id == test_id,
        TestAttempt.status == TestStatus.submitted,
    )


def _first_submitted_attempt(db: Session, user_id: int, test_id: int) -> Optional[TestAttempt]:
    return _submitted_attempts_query(db, user_id, test_id).order_by(TestAttempt.id.asc()).first()


def _practice_counter(db: Session, user_id: int, test_id: int) -> Optional[PracticeAttemptCounter]:
    return db.query(PracticeAttemptCounter).filter(
        PracticeAttemptCounter.user_id == user_id,
        PracticeAttemptCounter.test_id == test_id,
    ).first()


def _attempt_progress(
    db: Session,
    user_id: int,
    test_id: int,
    submitted_count: Optional[int] = None,
) -> dict:
    if submitted_count is None:
        submitted_count = _submitted_attempts_query(db, user_id, test_id).count()

    counter = _practice_counter(db, user_id, test_id)
    stored_practice_count = counter.count if counter else 0
    legacy_practice_count = max(submitted_count - 1, 0)
    practice_count = max(stored_practice_count, legacy_practice_count)

    return {
        "submitted_count": submitted_count,
        "practice_count": practice_count,
        "total_used": (1 if submitted_count > 0 else 0) + practice_count,
    }


def _set_practice_count(db: Session, user_id: int, test_id: int, count: int) -> PracticeAttemptCounter:
    counter = _practice_counter(db, user_id, test_id)
    if not counter:
        counter = PracticeAttemptCounter(user_id=user_id, test_id=test_id, count=0)
        db.add(counter)

    counter.count = max(counter.count or 0, count)
    counter.updated_at = datetime.now(timezone.utc)
    return counter


def _has_previous_submission(db: Session, user_id: int, test_id: int, attempt_id: int) -> bool:
    return db.query(TestAttempt.id).filter(
        TestAttempt.user_id == user_id,
        TestAttempt.test_id == test_id,
        TestAttempt.status == TestStatus.submitted,
        TestAttempt.id != attempt_id,
    ).first() is not None


# ── Tests ─────────────────────────────────────────────────────────

@router.get("")
def list_tests(db: Session = Depends(get_db), _=Depends(require_aspirant)):
    results = (
        db.query(Test, func.count(Question.id).label("question_count"))
        .outerjoin(Question, Test.id == Question.test_id)
        .filter(Test.is_published == True)
        .group_by(Test.id)
        .order_by(Test.created_at.desc())
        .all()
    )
    return [{
        "id": test.id, "title": test.title, "description": test.description,
        "duration_minutes": test.duration_minutes, "total_marks": test.total_marks,
        "question_count": question_count, "series_id": test.series_id,
        "created_at": test.created_at,
        "category": test.category, "series_name": test.series_name,
        "test_type": test.test_type, "subject": test.subject
    } for test, question_count in results]


@router.get("/{test_id}")
def get_test(test_id: int, db: Session = Depends(get_db), _=Depends(require_aspirant)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    question_count = db.query(Question).filter(Question.test_id == test_id).count()
    return {
        "id": test.id, "title": test.title, "description": test.description,
        "duration_minutes": test.duration_minutes, "total_marks": test.total_marks,
        "question_count": question_count, "series_id": test.series_id,
        "created_at": test.created_at
    }


# ── Attempt ───────────────────────────────────────────────────────

@router.post("/{test_id}/start")
def start_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant)
):
    test = db.query(Test).filter(Test.id == test_id, Test.is_published == True).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    progress = _attempt_progress(db, current_user.id, test_id)

    # Enforce reattempt limit
    if progress["total_used"] >= MAX_REATTEMPTS + 1:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum attempts ({MAX_REATTEMPTS + 1}) reached for this test."
        )

    # Delete any leftover in-progress attempt (user exited without submitting)
    leftovers = db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id,
        TestAttempt.test_id == test_id,
        TestAttempt.status == TestStatus.in_progress
    ).all()
    for leftover in leftovers:
        db.delete(leftover)
    db.commit()

    # Always create a fresh attempt
    attempt = TestAttempt(
        user_id=current_user.id,
        test_id=test_id,
        status=TestStatus.in_progress,
        started_at=datetime.now(timezone.utc)
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # First attempts are saved. Later attempts are temporary and deleted after submit.
    attempt_number  = progress["total_used"] + 1
    max_attempts    = MAX_REATTEMPTS + 1

    return {
        **_attempt_out(attempt),
        "attempt_number": attempt_number,
        "max_attempts": max_attempts
    }


def _attempt_out(a: TestAttempt) -> dict:
    return {
        "id": a.id, "test_id": a.test_id, "status": a.status,
        "started_at": a.started_at, "submitted_at": a.submitted_at,
        "score": a.score, "total_marks": a.total_marks,
        "tab_violations": a.tab_violations, "fullscreen_violations": a.fullscreen_violations
    }


@router.get("/{test_id}/attempt/{attempt_id}/questions")
def get_questions(
    test_id: int, attempt_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.id == attempt_id,
        TestAttempt.user_id == current_user.id,
        TestAttempt.test_id == test_id,
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status == TestStatus.submitted:
        raise HTTPException(status_code=400, detail="Test already submitted")

    questions = db.query(Question).filter(
        Question.test_id == test_id
    ).order_by(Question.order_index).all()

    return [{
        "id": q.id, "question_type": q.question_type,
        "question_text": q.question_text, "question_image_url": q.question_image_url,
        "options": q.options, "option_images": q.option_images,
        "order_index": q.order_index, "marks": q.marks,
        "negative_marks": q.negative_marks, "subject": q.subject, "topic": q.topic
    } for q in questions]


@router.patch("/{test_id}/attempt/{attempt_id}/violations")
def update_violations(
    test_id: int, attempt_id: int,
    payload: ViolationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.id == attempt_id,
        TestAttempt.user_id == current_user.id,
        TestAttempt.test_id == test_id,
    ).first()
    if not attempt or attempt.status == TestStatus.submitted:
        raise HTTPException(status_code=400, detail="Invalid attempt")

    if payload.tab_violations is not None:
        attempt.tab_violations = payload.tab_violations
    if payload.fullscreen_violations is not None:
        attempt.fullscreen_violations = payload.fullscreen_violations
    db.commit()
    return {"message": "Updated"}


@router.post("/{test_id}/attempt/{attempt_id}/save")
def save_answers(
    test_id: int, attempt_id: int,
    payload: BulkAnswerSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.id == attempt_id,
        TestAttempt.user_id == current_user.id,
        TestAttempt.test_id == test_id,
    ).first()
    if not attempt or attempt.status == TestStatus.submitted:
        raise HTTPException(status_code=400, detail="Invalid attempt")

    if _has_previous_submission(db, current_user.id, test_id, attempt_id):
        return {"message": "Practice answers are kept in browser until submit"}

    existing = {a.question_id: a for a in attempt.answers}
    for ans in payload.answers:
        if ans.question_id in existing:
            existing[ans.question_id].selected_answer = ans.selected_answer
            existing[ans.question_id].time_spent_seconds = ans.time_spent_seconds
        else:
            db.add(UserAnswer(
                attempt_id=attempt_id,
                question_id=ans.question_id,
                selected_answer=ans.selected_answer,
                time_spent_seconds=ans.time_spent_seconds
            ))
    db.commit()
    return {"message": "Saved"}


def _percentage(score: Optional[float], total_marks: Optional[float], digits: int = 2) -> float:
    return round((score or 0) / total_marks * 100, digits) if total_marks else 0


def _base_answer_detail(q: Question, selected_answer, is_correct, marks_awarded, time_spent_seconds):
    return {
        "question_id": q.id,
        "question_text": q.question_text,
        "question_type": q.question_type,
        "question_image_url": q.question_image_url,
        "options": q.options,
        "option_images": q.option_images,
        "correct_answer": q.correct_answer,
        "selected_answer": selected_answer,
        "is_correct": is_correct,
        "marks_awarded": marks_awarded,
        "marks": q.marks,
        "negative_marks": q.negative_marks,
        "time_spent_seconds": time_spent_seconds,
        "topper_answer": None,
        "topper_time_seconds": 0,
    }


def _evaluate_submission(test: Test, answers: List[AnswerSubmit]):
    submitted_by_question = {ans.question_id: ans for ans in answers}
    earned = 0.0
    details = []

    for q in sorted(test.questions, key=lambda x: x.order_index):
        submitted = submitted_by_question.get(q.id)
        selected = submitted.selected_answer if submitted else None
        if selected is not None and selected.strip() == "":
            selected = None
        is_correct, marks = evaluate_answer(q, selected)
        earned += marks
        details.append(_base_answer_detail(
            q,
            selected,
            is_correct,
            marks,
            submitted.time_spent_seconds if submitted else 0,
        ))

    total_marks = sum(q.marks for q in test.questions)
    return max(0.0, round(earned, 2)), total_marks, details


def _attempt_answer_details(test: Test, answers: list[UserAnswer]):
    answers_map = {a.question_id: a for a in answers}
    details = []
    for q in sorted(test.questions, key=lambda x: x.order_index):
        ua = answers_map.get(q.id)
        details.append(_base_answer_detail(
            q,
            ua.selected_answer if ua else None,
            ua.is_correct if ua else None,
            ua.marks_awarded if ua else 0,
            ua.time_spent_seconds if ua else 0,
        ))
    return details


def _result_payload(
    *,
    attempt_id,
    attempt_number: int,
    attempts_remaining: int,
    counts_for_leaderboard: bool,
    persisted: bool,
    test: Test,
    score: float,
    total_marks: float,
    submitted_at: datetime,
    tab_violations: int,
    answer_details: list[dict],
    current_user,
    db: Session,
    client_result_id: Optional[str] = None,
) -> dict:
    first_attempts = _get_first_attempts(test.id, db)

    topper = first_attempts[0] if first_attempts else None
    topper_data = None
    topper_answers_map = {}
    if topper:
        topper_answers_map = {ua.question_id: ua for ua in topper.answers}
        topper_data = {
            "user_id": topper.user_id,
            "full_name": topper.user.full_name,
            "score": topper.score,
            "total_marks": topper.total_marks,
            "percentage": _percentage(topper.score, topper.total_marks),
        }

    for detail in answer_details:
        topper_ua = topper_answers_map.get(detail["question_id"])
        detail["topper_answer"] = topper_ua.selected_answer if topper_ua else None
        detail["topper_time_seconds"] = topper_ua.time_spent_seconds if topper_ua else 0

    correct = sum(1 for a in answer_details if a["is_correct"] is True)
    incorrect = sum(1 for a in answer_details if a["is_correct"] is False)
    skipped = sum(1 for a in answer_details if a["is_correct"] is None)
    rank = next((i + 1 for i, a in enumerate(first_attempts) if a.user_id == current_user.id), None)

    return {
        "attempt_id": attempt_id,
        "client_result_id": client_result_id,
        "attempt_number": attempt_number,
        "attempts_remaining": attempts_remaining,
        "max_attempts": MAX_REATTEMPTS + 1,
        "counts_for_leaderboard": counts_for_leaderboard,
        "persisted": persisted,
        "test_id": test.id,
        "test_title": test.title,
        "score": score,
        "total_marks": total_marks,
        "percentage": _percentage(score, total_marks),
        "correct": correct,
        "incorrect": incorrect,
        "skipped": skipped,
        "submitted_at": submitted_at,
        "tab_violations": tab_violations,
        "rank": rank,
        "total_participants": len(first_attempts),
        "topper": topper_data,
        "answers": answer_details,
    }


@router.post("/{test_id}/attempt/{attempt_id}/submit")
def submit_test(
    test_id: int, attempt_id: int,
    payload: BulkAnswerSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.id == attempt_id,
        TestAttempt.user_id == current_user.id,
        TestAttempt.test_id == test_id,
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status == TestStatus.submitted:
        raise HTTPException(status_code=400, detail="Already submitted")

    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    db.query(UserAnswer).filter(UserAnswer.attempt_id == attempt_id).delete()

    score, total_marks, answer_details = _evaluate_submission(test, payload.answers)
    previous_submission_count = _submitted_attempts_query(db, current_user.id, test_id).count()
    is_first = previous_submission_count == 0
    submitted_at = datetime.now(timezone.utc)

    if is_first:
        for detail in answer_details:
            db.add(UserAnswer(
                attempt_id=attempt_id,
                question_id=detail["question_id"],
                selected_answer=detail["selected_answer"],
                is_correct=detail["is_correct"],
                marks_awarded=detail["marks_awarded"],
                time_spent_seconds=detail["time_spent_seconds"],
            ))

        attempt.status = TestStatus.submitted
        attempt.submitted_at = submitted_at
        attempt.score = score
        attempt.total_marks = total_marks
        db.commit()
        db.refresh(attempt)
        return {**_attempt_out(attempt), "persisted": True}

    progress_before = _attempt_progress(db, current_user.id, test_id, previous_submission_count)
    attempt_number = progress_before["total_used"] + 1
    attempts_remaining = max(0, MAX_REATTEMPTS + 1 - attempt_number)
    client_result_id = f"practice-{attempt_id}"

    result = _result_payload(
        attempt_id=client_result_id,
        client_result_id=client_result_id,
        attempt_number=attempt_number,
        attempts_remaining=attempts_remaining,
        counts_for_leaderboard=False,
        persisted=False,
        test=test,
        score=score,
        total_marks=total_marks,
        submitted_at=submitted_at,
        tab_violations=attempt.tab_violations,
        answer_details=answer_details,
        current_user=current_user,
        db=db,
    )

    _set_practice_count(db, current_user.id, test_id, progress_before["practice_count"] + 1)
    db.delete(attempt)
    db.commit()

    return {"id": client_result_id, "persisted": False, "result": result}


# ── Result ────────────────────────────────────────────────────────

@router.get("/attempt/{attempt_id}/result")
def get_result(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.id == attempt_id,
        TestAttempt.user_id == current_user.id
    ).first()
    if not attempt or attempt.status != TestStatus.submitted:
        raise HTTPException(status_code=404, detail="Result not found")

    test = attempt.test
    all_user_attempts = _submitted_attempts_query(db, current_user.id, test.id).order_by(TestAttempt.id.asc()).all()
    attempt_number = next((i + 1 for i, a in enumerate(all_user_attempts) if a.id == attempt_id), 1)
    is_first = attempt_number == 1

    progress = _attempt_progress(db, current_user.id, test.id, len(all_user_attempts))
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


def _get_first_attempts(test_id: int, db: Session) -> list[TestAttempt]:
    if db.get_bind().dialect.name == "postgresql":
        first_attempts_subquery = (
            db.query(TestAttempt)
            .filter(
                TestAttempt.test_id == test_id,
                TestAttempt.status == TestStatus.submitted,
            )
            .distinct(TestAttempt.user_id)
            .order_by(TestAttempt.user_id, TestAttempt.id.asc())
            .subquery()
        )

        FirstAttempt = aliased(TestAttempt, first_attempts_subquery)

        return (
            db.query(FirstAttempt)
            .options(joinedload(FirstAttempt.user))
            .order_by(
                FirstAttempt.score.desc(),
                FirstAttempt.id.asc(),
            )
            .all()
        )

    first_attempt_ids_subquery = (
        db.query(
            TestAttempt.id.label("attempt_id"),
            func.row_number().over(
                partition_by=TestAttempt.user_id,
                order_by=TestAttempt.id.asc(),
            ).label("attempt_rank"),
        )
        .filter(
            TestAttempt.test_id == test_id,
            TestAttempt.status == TestStatus.submitted,
        )
        .subquery()
    )

    return (
        db.query(TestAttempt)
        .options(joinedload(TestAttempt.user))
        .join(first_attempt_ids_subquery, TestAttempt.id == first_attempt_ids_subquery.c.attempt_id)
        .filter(first_attempt_ids_subquery.c.attempt_rank == 1)
        .order_by(
            TestAttempt.score.desc(),
            TestAttempt.id.asc(),
        )
        .all()
    )


# ── Leaderboard ───────────────────────────────────────────────────

def _leaderboard_cache_key_builder(func, namespace="", *, request=None, response=None, args=None, kwargs=None):
    args = args or ()
    kwargs = kwargs or {}

    test_id = kwargs.get("test_id")
    current_user = kwargs.get("current_user")

    if test_id is None and request is not None:
        test_id = request.path_params.get("test_id")
    if test_id is None and args:
        test_id = args[0]
    if current_user is None and len(args) >= 3:
        current_user = args[2]

    user_id = getattr(current_user, "id", "unknown")
    return f"{namespace}:{func.__module__}:{func.__name__}:test:{test_id}:user:{user_id}"


@router.get("/{test_id}/leaderboard")
@cache(expire=60, key_builder=_leaderboard_cache_key_builder)
def get_leaderboard(test_id: int, db: Session = Depends(get_db), current_user=Depends(require_aspirant)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    first_attempts = _get_first_attempts(test_id, db)

    leaderboard = []
    current_user_rank = None
    for rank, attempt in enumerate(first_attempts, 1):
        pct = round(attempt.score / attempt.total_marks * 100, 1) if attempt.total_marks else 0
        if attempt.user_id == current_user.id:
            current_user_rank = rank
        leaderboard.append({
            "rank": rank,
            "user_id": attempt.user_id,
            "full_name": attempt.user.full_name,
            "score": attempt.score,
            "total_marks": attempt.total_marks,
            "percentage": pct,
            "submitted_at": attempt.submitted_at,
            "tab_violations": attempt.tab_violations,
            "is_current_user": attempt.user_id == current_user.id
        })

    return {
        "test_id": test_id,
        "test_title": test.title,
        "total_participants": len(leaderboard),
        "current_user_rank": current_user_rank,
        "leaderboard": leaderboard
    }


# ── My attempts ───────────────────────────────────────────────────

@router.get("/{test_id}/my-attempts")
def my_attempts(test_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    first_attempt = _first_submitted_attempt(db, current_user.id, test_id)
    if not first_attempt:
        return []

    submitted_count = _submitted_attempts_query(db, current_user.id, test_id).count()
    progress = _attempt_progress(db, current_user.id, test_id, submitted_count)

    return [{
        "attempt_id": first_attempt.id,
        "attempt_number": 1,
        "counts_for_leaderboard": True,
        "is_first": True,
        "status": first_attempt.status,
        "score": first_attempt.score,
        "total_marks": first_attempt.total_marks,
        "percentage": _percentage(first_attempt.score, first_attempt.total_marks, 1),
        "started_at": first_attempt.started_at,
        "submitted_at": first_attempt.submitted_at,
        "attempts_remaining": max(0, MAX_REATTEMPTS + 1 - progress["total_used"])
    }]


@router.get("/my/history")
def my_history(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    attempts = db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id,
        TestAttempt.status == TestStatus.submitted
    ).order_by(TestAttempt.id.asc()).all()

    first_by_test = {}
    for attempt in attempts:
        first_by_test.setdefault(attempt.test_id, attempt)

    first_attempts = sorted(
        first_by_test.values(),
        key=lambda a: a.started_at or a.submitted_at or datetime.min,
        reverse=True,
    )

    return [{
        "id": a.id,
        "test_id": a.test_id,
        "status": a.status,
        "started_at": a.started_at,
        "submitted_at": a.submitted_at,
        "score": a.score,
        "total_marks": a.total_marks,
        "tab_violations": a.tab_violations,
        "fullscreen_violations": a.fullscreen_violations,
    } for a in first_attempts]
