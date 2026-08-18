from datetime import datetime, timezone
import logging
import os
from urllib.parse import urlencode

from fastapi import HTTPException, UploadFile

from app.core.config import settings
from app.models.models import Question, User
from app.services.cloudinary_service import (
    optimize_delivery_image_url,
    optimize_delivery_image_urls,
)

logger = logging.getLogger(__name__)

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

def _password_reset_url(token: str) -> tuple[str, bool]:
    """Build a password-reset URL and return (url, is_local).

    is_local is True when FRONTEND_URL points to localhost, meaning
    the generated link won't work for external users.
    """
    base = settings.FRONTEND_URL.rstrip("/")
    url = f"{base}/reset-password?{urlencode({'token': token})}"
    is_local = "localhost" in base or "127.0.0.1" in base
    if is_local:
        logger.warning(
            "Password-reset link generated with localhost FRONTEND_URL (%s). "
            "This link will not work for external users.",
            base,
        )
    return url, is_local

def _normalize_cursor_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value

def _encode_user_cursor(user: User) -> str:
    return f"{_normalize_cursor_datetime(user.created_at).isoformat()}|{user.id}"

def _parse_user_cursor(cursor: str) -> tuple[datetime, int]:
    try:
        created_at_raw, user_id_raw = cursor.rsplit("|", 1)
        created_at = _normalize_cursor_datetime(datetime.fromisoformat(created_at_raw))
        return created_at, int(user_id_raw)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid cursor") from exc

def _question_out(q: Question) -> dict:
    return {
        "id": q.id,
        "question_type": q.question_type,
        "question_text": q.question_text,
        "question_image_url": optimize_delivery_image_url(q.question_image_url),
        "options": q.options,
        "option_images": optimize_delivery_image_urls(q.option_images),
        "correct_answer": q.correct_answer,
        "marks": q.marks,
        "negative_marks": q.negative_marks,
        "order_index": q.order_index,
        "subject": q.subject,
        "topic": q.topic,
    }

async def read_upload_bytes(
    file: UploadFile,
    max_size: int,
    allowed_extensions: list[str] | None = None,
    allowed_content_types: list[str] | None = None,
) -> bytes:
    """Read and validate an uploaded file, enforcing size and format constraints."""
    if allowed_extensions and file.filename:
        secure_name = os.path.basename(file.filename.replace("\\", "/"))
        if "." not in secure_name:
            raise HTTPException(status_code=400, detail="File must have an extension")
        ext = secure_name.rsplit(".", 1)[-1].lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Only {', '.join(allowed_extensions)} files accepted",
            )
            
    if allowed_content_types and file.content_type:
        if not any(file.content_type.startswith(ct) for ct in allowed_content_types):
            raise HTTPException(
                status_code=400,
                detail=f"Only {', '.join(allowed_content_types)} files are accepted",
            )

    contents_arr = bytearray()
    while chunk := await file.read(1024 * 1024):
        contents_arr.extend(chunk)
        if len(contents_arr) > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum allowed size is {max_size // (1024 * 1024)}MB.",
            )
    contents_bytes = bytes(contents_arr)

    if not contents_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    return contents_bytes
