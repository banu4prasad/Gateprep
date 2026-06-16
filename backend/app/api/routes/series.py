from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_optional_current_user, require_admin, require_aspirant
from app.core.database import get_db
from app.models.models import Question, Test, TestAttempt, TestSeries, TestStatus

router = APIRouter(prefix="/series", tags=["Test Series"])


class SeriesCreate(BaseModel):
    title: str
    description: Optional[str] = None


class SeriesOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    test_count: int = 0

    model_config = ConfigDict(from_attributes=True)


@router.get("")
def list_series(
    db: Session = Depends(get_db), current_user=Depends(get_optional_current_user)
):
    if current_user:
        completed_subquery = (
            db.query(
                Test.series_id.label("series_id"),
                func.count(func.distinct(TestAttempt.test_id)).label("completed_count"),
            )
            .join(
                TestAttempt,
                (TestAttempt.test_id == Test.id)
                & (TestAttempt.status == TestStatus.submitted)
                & (TestAttempt.user_id == current_user.id),
            )
            .filter(Test.is_published.is_(True))
            .group_by(Test.series_id)
            .subquery()
        )

        results = (
            db.query(
                TestSeries,
                func.count(Test.id).label("test_count"),
                func.coalesce(completed_subquery.c.completed_count, 0).label(
                    "completed_count"
                ),
            )
            .outerjoin(
                Test, (Test.series_id == TestSeries.id) & (Test.is_published.is_(True))
            )
            .outerjoin(
                completed_subquery, completed_subquery.c.series_id == TestSeries.id
            )
            .group_by(TestSeries.id, completed_subquery.c.completed_count)
            .order_by(TestSeries.created_at.desc())
            .all()
        )

        return [
            {
                "id": s.id,
                "title": s.title,
                "description": s.description,
                "test_count": test_count,
                "completed_count": completed_count,
                "created_at": s.created_at,
            }
            for s, test_count, completed_count in results
        ]
    else:
        results_unauth = (
            db.query(TestSeries, func.count(Test.id).label("test_count"))
            .outerjoin(
                Test, (Test.series_id == TestSeries.id) & (Test.is_published.is_(True))
            )
            .group_by(TestSeries.id)
            .order_by(TestSeries.created_at.desc())
            .all()
        )

        return [
            {
                "id": s.id,
                "title": s.title,
                "description": s.description,
                "test_count": test_count,
                "completed_count": 0,
                "created_at": s.created_at,
            }
            for s, test_count in results_unauth
        ]


@router.get("/{series_id}/tests")
def get_series_tests(
    series_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant),
):
    series = db.query(TestSeries).filter(TestSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    question_counts = (
        db.query(
            Question.test_id.label("test_id"), func.count(Question.id).label("q_count")
        )
        .group_by(Question.test_id)
        .subquery()
    )

    results = (
        db.query(
            Test,
            func.coalesce(question_counts.c.q_count, 0).label("question_count"),
            TestAttempt.id.label("attempt_id"),
            TestAttempt.score.label("score"),
        )
        .outerjoin(question_counts, question_counts.c.test_id == Test.id)
        .outerjoin(
            TestAttempt,
            (TestAttempt.test_id == Test.id)
            & (TestAttempt.user_id == current_user.id)
            & (TestAttempt.status == TestStatus.submitted),
        )
        .filter(Test.series_id == series_id, Test.is_published.is_(True))
        .order_by(Test.series_order)
        .all()
    )

    result = []
    for t, question_count, attempt_id, score in results:
        result.append(
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "duration_minutes": t.duration_minutes,
                "total_marks": t.total_marks,
                "question_count": question_count,
                "series_order": t.series_order,
                "is_completed": attempt_id is not None,
                "attempt_id": attempt_id,
                "score": score,
            }
        )

    return {
        "series": {
            "id": series.id,
            "title": series.title,
            "description": series.description,
        },
        "tests": result,
    }


@router.post("", status_code=201)
def create_series(
    payload: SeriesCreate, db: Session = Depends(get_db), current=Depends(require_admin)
):
    s = TestSeries(
        title=payload.title, description=payload.description, created_by=current.id
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{series_id}")
def delete_series(
    series_id: int, db: Session = Depends(get_db), _=Depends(require_admin)
):
    s = db.query(TestSeries).filter(TestSeries.id == series_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    # Unlink tests from series
    db.query(Test).filter(Test.series_id == series_id).update({"series_id": None})
    db.delete(s)
    db.commit()
    return {"message": "Deleted"}
