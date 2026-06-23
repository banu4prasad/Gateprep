from datetime import datetime, timezone

from typing import Optional, cast, Literal
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from fastapi_cache import FastAPICache
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import (create_access_token, decode_token,
                               generate_session_id, hash_password,
                               hash_password_reset_token, verify_password)
from app.models.models import PasswordResetToken, User, UserRole

router = APIRouter(prefix="/auth", tags=["Authentication"])

ADMIN_USERS_CACHE_NAMESPACE = "admin-users"


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class AuthUserResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    full_name: str


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _auth_cookie_max_age_seconds() -> int:
    return settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        max_age=_auth_cookie_max_age_seconds(),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=cast(Literal["lax", "strict", "none"] | None, settings.AUTH_COOKIE_SAMESITE),
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        path="/",
        secure=settings.AUTH_COOKIE_SECURE,
        httponly=True,
        samesite=cast(Literal["lax", "strict", "none"] | None, settings.AUTH_COOKIE_SAMESITE),
    )


def _auth_user_response(user: User) -> AuthUserResponse:
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        full_name=user.full_name,
    )


def create_token_for_session(user: User, session_id: str) -> str:
    return create_access_token(
        {"sub": user.id, "role": user.role, "sid": session_id, "auth": "cookie"}
    )


def create_token_for_user(user: User, db: Session, request: Optional[Request] = None) -> str:
    session_id = generate_session_id()
    user.current_session_id = session_id
    if request and request.client:
        user.current_ip = request.client.host
    db.commit()
    db.refresh(user)

    # Defensive backstop: if anything between commit and return fails, force a
    # fresh session id and commit again so a failed login cannot leave the user
    # with a silently broken session.
    try:
        return create_token_for_session(user, session_id)
    except Exception:
        try:
            user.current_session_id = generate_session_id()
            db.commit()
        except Exception:
            db.rollback()
        raise


# ── Register ──────────────────────────────────────────────────────


@router.post("/register", response_model=AuthUserResponse)
@limiter.limit("3/minute")
def register(
    request: Request,
    payload: RegisterRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=400, detail="Password must be at least 6 characters"
        )

    is_first = db.query(User).count() == 0
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=UserRole.admin if is_first else UserRole.user,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    background_tasks.add_task(
        FastAPICache.clear, namespace=ADMIN_USERS_CACHE_NAMESPACE
    )
    _set_auth_cookie(response, create_token_for_user(user, db, request))
    return _auth_user_response(user)


# ── Login ─────────────────────────────────────────────────────────


@router.post("/login", response_model=AuthUserResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if (
        not user
        or not user.hashed_password
        or not verify_password(payload.password, user.hashed_password)
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled. Contact admin.")

    _set_auth_cookie(response, create_token_for_user(user, db, request))
    return _auth_user_response(user)


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if token:
        payload = decode_token(token)
        if payload:
            user_id = payload.get("sub")
            session_id = payload.get("sid")
            try:
                if user_id is not None:
                    user_id = int(user_id)
            except (ValueError, TypeError):
                user_id = None

            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user and (not session_id or user.current_session_id == session_id):
                    user.current_session_id = generate_session_id()
                    db.commit()

    _clear_auth_cookie(response)
    return {"message": "Logged out"}


# ── Refresh Token ─────────────────────────────────────────────────


@router.post("/refresh", response_model=AuthUserResponse)
@limiter.limit("10/minute")
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    """Refresh the access token without invalidating in-flight requests."""
    token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    if not payload or payload.get("auth") != "cookie":
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    session_id = payload.get("sid")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user or not session_id or user.current_session_id != session_id:
        raise HTTPException(status_code=401, detail="Session expired")

    _set_auth_cookie(response, create_token_for_session(user, session_id))
    return _auth_user_response(user)


# ── Reset Password ────────────────────────────────────────────────


@router.post("/reset-password")
@limiter.limit("3/minute")
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token = payload.token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=400, detail="Password must be at least 6 characters"
        )

    reset_token = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == hash_password_reset_token(token))
        .first()
    )
    now = _utcnow()
    if (
        not reset_token
        or reset_token.used_at is not None
        or _as_utc(reset_token.expires_at) < now
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user.hashed_password = hash_password(payload.password)
    user.current_session_id = None
    user.current_ip = None
    reset_token.used_at = now
    (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.id != reset_token.id,
        )
        .update({PasswordResetToken.used_at: now}, synchronize_session=False)
    )
    db.commit()

    return {"message": "Password reset successful. Please sign in."}


# ── Me ────────────────────────────────────────────────────────────


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "profile_photo": current_user.profile_photo,
        "created_at": current_user.created_at,
    }
