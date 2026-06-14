import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import (BaseModel, ConfigDict, Field, ValidationError,
                      field_validator, model_validator)
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (generate_password_reset_token,
                               hash_password_reset_token)
from app.models.models import (PasswordResetToken, Question, QuestionType,
                               Test, User, UserRole)
from app.services.answer_utils import (is_valid_nat_answer,
                                       normalize_question_type,
                                       split_answer_tokens)
from app.services.cloudinary_service import delete_image, upload_image
from app.services.pdf_service import extract_questions_from_pdf

router = APIRouter(prefix="/admin", tags=["Admin"])

MAX_PDF_UPLOAD_SIZE_BYTES = 1 * 1024 * 1024 * 1024
PDF_UPLOAD_CHUNK_SIZE_BYTES = 8192

PDF_IMPORT_BLOCKING_WARNINGS = {
    "missing_question_text",
    "missing_answer",
    "missing_options",
    "too_few_options",
    "too_many_options",
    "nat_has_non_numeric_answer",
    "mcq_has_multiple_answers",
    "invalid_choice_answer",
    "ambiguous_answer_key",
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _password_reset_url(token: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?{urlencode({'token': token})}"


async def _save_pdf_upload(pdf_file: UploadFile, path: str) -> None:
    file_size = 0

    try:
        with open(path, "wb") as f:
            while chunk := await pdf_file.read(PDF_UPLOAD_CHUNK_SIZE_BYTES):
                file_size += len(chunk)
                if file_size > MAX_PDF_UPLOAD_SIZE_BYTES:
                    raise HTTPException(status_code=413, detail="File too large")
                f.write(chunk)
    except HTTPException:
        try:
            os.remove(path)
        except OSError:
            pass
        raise


def _pdf_blocking_warnings(question: dict) -> list[str]:
    warnings = question.get("warnings") or []
    return [warning for warning in warnings if warning in PDF_IMPORT_BLOCKING_WARNINGS]


def _pdf_review_detail(questions: list[dict]) -> str:
    blocked = []
    review_only = []
    for idx, question in enumerate(questions, start=1):
        label = (
            question.get("question_number")
            or question.get("global_question_number")
            or idx
        )
        warnings = question.get("warnings") or []
        blocking = _pdf_blocking_warnings(question)
        if blocking:
            blocked.append(f"Q{label}: {', '.join(blocking)}")
        elif question.get("needs_review"):
            review_only.append(
                f"Q{label}: {', '.join(warnings) if warnings else 'needs_review'}"
            )

    if not blocked:
        return ""

    preview = "; ".join(blocked[:8])
    remaining = len(blocked) - 8
    if remaining > 0:
        preview += f"; and {remaining} more"

    suffix = ""
    if review_only:
        suffix = f" Non-blocking review warnings: {len(review_only)} question(s)."

    return (
        f"PDF extraction found {len(questions)} question(s), but {len(blocked)} have blocking issues. "
        f"{preview}. Fix these or upload JSON with corrected fields.{suffix}"
    )


# ── Users ─────────────────────────────────────────────────────────


@router.get("/users")
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    q: str = Query("", max_length=255),
    role: Optional[UserRole] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    users_query = db.query(User)
    search = q.strip()
    if search:
        pattern = f"%{search}%"
        users_query = users_query.filter(
            or_(User.full_name.ilike(pattern), User.email.ilike(pattern))
        )
    if role is not None:
        users_query = users_query.filter(User.role == role)

    total = users_query.count()
    aspirants_count = db.query(User).filter(User.role == UserRole.aspirant).count()
    pending_count = db.query(User).filter(User.role == UserRole.user).count()

    users = users_query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    items = [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "google_id": u.google_id is not None,
            "created_at": u.created_at,
        }
        for u in users
    ]
    return {
        "items": items,
        "total": total,
        "aspirants_count": aspirants_count,
        "pending_count": pending_count,
        "limit": limit,
        "offset": skip,
    }


class RoleUpdate(BaseModel):
    role: str


@router.patch("/users/{user_id}/role")
def update_role(
    user_id: int,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    current=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    user.role = UserRole(payload.role)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "role": user.role,
        "email": user.email,
        "full_name": user.full_name,
    }


@router.patch("/users/{user_id}/status")
def toggle_status(
    user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {
        "message": f"User {'activated' if user.is_active else 'deactivated'}",
        "is_active": user.is_active,
    }


@router.post("/users/{user_id}/password-reset")
def create_password_reset_link(
    user_id: int, db: Session = Depends(get_db), current=Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = _utcnow()
    (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
        .update({PasswordResetToken.used_at: now}, synchronize_session=False)
    )

    token = generate_password_reset_token()
    expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)
    reset_token = PasswordResetToken(
        user_id=user.id,
        created_by=current.id,
        token_hash=hash_password_reset_token(token),
        expires_at=expires_at,
    )
    db.add(reset_token)
    db.commit()

    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "reset_url": _password_reset_url(token),
        "expires_at": expires_at,
    }


# ── Tests ─────────────────────────────────────────────────────────


@router.get("/tests")
def list_tests(db: Session = Depends(get_db), _=Depends(require_admin)):
    results = (
        db.query(Test, func.count(Question.id).label("question_count"))
        .outerjoin(Question, Test.id == Question.test_id)
        .group_by(Test.id)
        .order_by(Test.created_at.desc())
        .all()
    )
    return [
        {
            "id": test.id,
            "title": test.title,
            "description": test.description,
            "duration_minutes": test.duration_minutes,
            "total_marks": test.total_marks,
            "question_count": question_count,
            "series_id": test.series_id,
            "is_published": test.is_published,
            "created_at": test.created_at,
            "category": test.category,
            "series_name": test.series_name,
            "test_type": test.test_type,
            "subject": test.subject,
        }
        for test, question_count in results
    ]


@router.get("/tests/{test_id}")
def get_test(test_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "id": test.id,
        "title": test.title,
        "description": test.description,
        "duration_minutes": test.duration_minutes,
        "total_marks": test.total_marks,
        "question_count": len(test.questions),
        "series_id": test.series_id,
        "is_published": test.is_published,
        "created_at": test.created_at,
        "category": test.category,
        "series_name": test.series_name,
        "test_type": test.test_type,
        "subject": test.subject,
    }


@router.post("/tests", status_code=201)
async def create_test(
    title: str = Form(...),
    description: str = Form(None),
    duration_minutes: int = Form(180),
    series_id: int = Form(None),
    series_order: int = Form(0),
    category: str = Form(None),
    series_name: str = Form(None),
    test_type: str = Form(None),
    subject: str = Form(None),
    pdf_file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current=Depends(require_admin),
):
    pdf_filename = None
    extracted = []

    if pdf_file and pdf_file.filename:
        if not pdf_file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files accepted")
        safe_filename = f"{uuid.uuid4().hex}.pdf"
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        path = os.path.join(settings.UPLOAD_DIR, safe_filename)
        await _save_pdf_upload(pdf_file, path)
        pdf_filename = safe_filename
        extracted = await run_in_threadpool(extract_questions_from_pdf, path)
        if not extracted:
            try:
                os.remove(path)
            except OSError:
                pass
            raise HTTPException(
                status_code=400, detail="No questions could be extracted from PDF."
            )

        review_detail = _pdf_review_detail(extracted)
        if review_detail:
            try:
                os.remove(path)
            except OSError:
                pass
            raise HTTPException(status_code=400, detail=review_detail)

    total_marks = sum(q["marks"] for q in extracted) if extracted else 0.0
    test = Test(
        title=title,
        description=description,
        duration_minutes=duration_minutes,
        pdf_filename=pdf_filename,
        total_marks=total_marks,
        series_id=series_id,
        series_order=series_order,
        category=category,
        series_name=series_name,
        test_type=test_type,
        subject=subject,
        created_by=current.id,
    )
    db.add(test)
    db.commit()
    db.refresh(test)

    for idx, q in enumerate(extracted):
        db.add(
            Question(
                test_id=test.id,
                question_type=QuestionType(q["question_type"]),
                question_text=q["question_text"],
                options=q["options"],
                correct_answer=q["correct_answer"],
                marks=q["marks"],
                negative_marks=q["negative_marks"],
                subject=q.get("subject"),
                topic=q.get("topic"),
                order_index=idx,
            )
        )
    if extracted:
        db.commit()

    return {
        "id": test.id,
        "title": test.title,
        "question_count": len(extracted),
        "total_marks": total_marks,
    }


@router.delete("/tests/{test_id}")
def delete_test(test_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(test)
    db.commit()
    return {"message": "Deleted"}


# ── Questions ─────────────────────────────────────────────────────


@router.get("/tests/{test_id}/questions")
def get_questions(
    test_id: int, db: Session = Depends(get_db), _=Depends(require_admin)
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")
    return [
        {
            "id": q.id,
            "question_type": q.question_type,
            "question_text": q.question_text,
            "question_image_url": q.question_image_url,
            "options": q.options,
            "option_images": q.option_images,
            "correct_answer": q.correct_answer,
            "marks": q.marks,
            "negative_marks": q.negative_marks,
            "order_index": q.order_index,
            "subject": q.subject,
            "topic": q.topic,
        }
        for q in sorted(test.questions, key=lambda q: q.order_index)
    ]


class QuestionIn(BaseModel):
    question_type: str = "mcq"
    question_text: str
    options: List[str] = []
    correct_answer: str
    marks: float = 1.0
    negative_marks: float = 0.33
    subject: Optional[str] = None
    topic: Optional[str] = None

    @model_validator(mode="after")
    def validate_answer_shape(self):
        q_type = normalize_question_type(self.question_type)
        if q_type not in {"mcq", "msq", "nat"}:
            raise ValueError("question_type must be one of mcq, msq, or nat")

        self.question_type = q_type
        self.correct_answer = self.correct_answer.strip().upper().replace(" ", "")
        if not self.correct_answer:
            raise ValueError("correct_answer is required")

        if q_type == "mcq":
            if self.correct_answer not in {"A", "B", "C", "D"}:
                raise ValueError("MCQ correct_answer must be one of A, B, C, or D")
        elif q_type == "msq":
            selected = [
                part.strip().upper()
                for part in split_answer_tokens(self.correct_answer)
            ]
            if not selected or any(
                part not in {"A", "B", "C", "D"} for part in selected
            ):
                raise ValueError(
                    "MSQ correct_answer must contain option letters like A,C"
                )
            self.correct_answer = ",".join(dict.fromkeys(selected))
            self.negative_marks = 0.0
        else:
            if not is_valid_nat_answer(self.correct_answer):
                raise ValueError(
                    "NAT correct_answer must be a number or range like 41.5-42.5 or 41.5:42.5"
                )
            self.options = []
            self.negative_marks = 0.0

        return self


class QuestionsBulk(BaseModel):
    questions: List[QuestionIn]


class QuestionFileImport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_type: QuestionType
    question_text: str = Field(..., min_length=1)
    options: List[str] = Field(default_factory=list)
    correct_answer: str = Field(..., min_length=1)
    marks: float = 1.0
    negative_marks: float = 0.33
    order_index: int = 0
    subject: Optional[str] = None
    topic: Optional[str] = None

    @field_validator("question_text", "correct_answer")
    @classmethod
    def validate_required_text(cls, value: str):
        stripped = value.strip()
        if not stripped:
            raise ValueError("field cannot be blank")
        return stripped

    @field_validator("subject", "topic")
    @classmethod
    def normalize_optional_text(cls, value: Optional[str]):
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("options", mode="before")
    @classmethod
    def validate_options_list(cls, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("options must be a JSON list")
        if any(not isinstance(option, str) for option in value):
            raise ValueError("options must contain only strings")
        return value

    @field_validator("marks", "negative_marks", mode="before")
    @classmethod
    def validate_numeric_fields(cls, value):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("field must be a number")
        return float(value)

    @field_validator("order_index", mode="before")
    @classmethod
    def validate_order_index(cls, value):
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError("order_index must be an integer")
        return value

    @model_validator(mode="after")
    def validate_answer_shape(self):
        q_type = self.question_type.value
        self.correct_answer = self.correct_answer.strip().upper().replace(" ", "")

        if q_type == "mcq":
            if self.correct_answer not in {"A", "B", "C", "D"}:
                raise ValueError("MCQ correct_answer must be one of A, B, C, or D")
        elif q_type == "msq":
            selected = [
                part.strip().upper()
                for part in split_answer_tokens(self.correct_answer)
            ]
            if not selected or any(
                part not in {"A", "B", "C", "D"} for part in selected
            ):
                raise ValueError(
                    "MSQ correct_answer must contain option letters like A,C"
                )
            self.correct_answer = ",".join(dict.fromkeys(selected))
            self.negative_marks = 0.0
        else:
            if not is_valid_nat_answer(self.correct_answer):
                raise ValueError(
                    "NAT correct_answer must be a number or range like 41.5-42.5 or 41.5:42.5"
                )
            self.options = []
            self.negative_marks = 0.0

        return self


def _questions_from_json_root(data: Any) -> list[Any]:
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        questions = data.get("questions")
        if isinstance(questions, list):
            return questions
        raise HTTPException(
            status_code=400,
            detail='JSON object must contain a "questions" key with a list value',
        )
    raise HTTPException(
        status_code=400,
        detail='JSON root must be a questions array or an object containing a "questions" array',
    )


def _format_question_validation_errors(
    question_index: int, exc: ValidationError
) -> list[dict]:
    errors = []
    for error in exc.errors():
        loc = ".".join(str(part) for part in error.get("loc", ())) or "question"
        errors.append(
            {
                "question_index": question_index,
                "field": loc,
                "message": error.get("msg", "Invalid value"),
            }
        )
    return errors


@router.post("/tests/{test_id}/questions", status_code=201)
def add_questions(
    test_id: int,
    payload: QuestionsBulk,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")
    existing = len(test.questions)
    total_added = 0.0
    BATCH_SIZE = 20
    for idx, q in enumerate(payload.questions):
        db.add(
            Question(
                test_id=test_id,
                question_type=QuestionType(q.question_type),
                question_text=q.question_text,
                options=q.options,
                correct_answer=q.correct_answer,
                marks=q.marks,
                negative_marks=q.negative_marks,
                subject=q.subject,
                topic=q.topic,
                order_index=existing + idx,
            )
        )
        total_added += q.marks
        if (idx + 1) % BATCH_SIZE == 0:
            db.commit()
    test.total_marks += total_added
    db.commit()
    return {
        "message": f"Added {len(payload.questions)} questions",
        "total_in_test": existing + len(payload.questions),
    }


@router.post("/tests/{test_id}/questions/upload-file", status_code=201)
async def upload_questions_file(
    test_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    if not file.filename or not file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="Only .json files accepted")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded JSON file is empty")

    try:
        decoded = contents.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="JSON file must be UTF-8 encoded")

    try:
        raw_data = json.loads(decoded)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON syntax at line {exc.lineno}, column {exc.colno}: {exc.msg}",
        )

    raw_questions = _questions_from_json_root(raw_data)
    if not raw_questions:
        raise HTTPException(
            status_code=400, detail="JSON file does not contain any questions"
        )

    validated_questions: list[QuestionFileImport] = []
    validation_errors: list[dict] = []
    for idx, raw_question in enumerate(raw_questions, start=1):
        if not isinstance(raw_question, dict):
            validation_errors.append(
                {
                    "question_index": idx,
                    "field": "question",
                    "message": "Each question must be a JSON object",
                }
            )
            continue
        try:
            validated_questions.append(QuestionFileImport.model_validate(raw_question))
        except ValidationError as exc:
            validation_errors.extend(_format_question_validation_errors(idx, exc))

    if validation_errors:
        raise HTTPException(
            status_code=422,
            detail={
                "message": f"Validation failed for {len(validation_errors)} field(s)",
                "errors": validation_errors,
            },
        )

    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")

    existing = (
        db.query(func.count(Question.id)).filter(Question.test_id == test_id).scalar()
        or 0
    )
    total_added = 0.0
    for question in validated_questions:
        db.add(
            Question(
                test_id=test_id,
                question_type=question.question_type,
                question_text=question.question_text,
                options=question.options,
                correct_answer=question.correct_answer,
                marks=question.marks,
                negative_marks=question.negative_marks,
                order_index=question.order_index,
                subject=question.subject,
                topic=question.topic,
            )
        )
        total_added += question.marks

    test.total_marks = (test.total_marks or 0.0) + total_added
    db.commit()

    imported_count = len(validated_questions)
    return {
        "status": "success",
        "message": f"Imported {imported_count} question{'' if imported_count == 1 else 's'} from JSON file",
        "imported_count": imported_count,
        "total_in_test": existing + imported_count,
    }


@router.post("/questions/{question_id}/image")
async def upload_question_image(
    question_id: int,
    image: UploadFile = File(...),
    target: str = "question",
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Upload image for a question or option. target='question' or 'A'/'B'/'C'/'D'"""
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    contents = await image.read()
    result = await run_in_threadpool(
        upload_image, contents, folder="gate-prep/questions"
    )
    if not result.get("url"):
        raise HTTPException(
            status_code=500,
            detail=f"Image upload failed: {result.get('error', 'Unknown error')}",
        )

    if target == "question":
        if q.question_image_id:
            delete_image(q.question_image_id)
        q.question_image_url = result["url"]
        q.question_image_id = result["public_id"]
    elif target.upper() in ["A", "B", "C", "D"]:
        imgs = dict(q.option_images or {})
        imgs[target.upper()] = result["url"]
        q.option_images = imgs
    else:
        raise HTTPException(
            status_code=400, detail="target must be 'question' or A/B/C/D"
        )

    db.commit()
    return {"url": result["url"], "target": target}


@router.delete("/questions/{question_id}/image")
def delete_question_image(
    question_id: int,
    target: str = "question",
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Not found")
    if target == "question":
        if q.question_image_id:
            delete_image(q.question_image_id)
        q.question_image_url = None
        q.question_image_id = None
    elif target.upper() in ["A", "B", "C", "D"]:
        imgs = dict(q.option_images or {})
        imgs.pop(target.upper(), None)
        q.option_images = imgs
    db.commit()
    return {"message": "Image deleted"}


@router.delete("/tests/{test_id}/questions/{question_id}")
def delete_question(
    test_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    q = (
        db.query(Question)
        .filter(Question.id == question_id, Question.test_id == test_id)
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Not found")
    if q.question_image_id:
        delete_image(q.question_image_id)
    db.delete(q)
    db.commit()
    return {"message": "Deleted"}


class TestPatch(BaseModel):
    series_id: Optional[int] = None
    series_order: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_published: Optional[bool] = None
    category: Optional[str] = None
    series_name: Optional[str] = None
    test_type: Optional[str] = None
    subject: Optional[str] = None


@router.patch("/tests/{test_id}")
def update_test(
    test_id: int,
    payload: TestPatch,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")
    update_data = payload.model_dump(exclude_none=True)
    for key, val in update_data.items():
        if hasattr(test, key):
            setattr(test, key, val)
    db.commit()
    return {"message": "Updated"}
