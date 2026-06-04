from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    generate_session_id,
)
from app.models.models import User, UserRole
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthUserResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    full_name: str


def _auth_cookie_max_age_seconds() -> int:
    return settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        max_age=_auth_cookie_max_age_seconds(),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        path="/",
        secure=settings.AUTH_COOKIE_SECURE,
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )


def _auth_user_response(user: User) -> AuthUserResponse:
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        full_name=user.full_name,
    )


def create_token_for_user(user: User, db: Session, request: Request = None) -> str:
    session_id = generate_session_id()
    user.current_session_id = session_id
    if request:
        user.current_ip = request.client.host
    db.commit()
    return create_access_token({"sub": user.id, "role": user.role, "sid": session_id, "auth": "cookie"})


# ── Register ──────────────────────────────────────────────────────

@router.post("/register", response_model=AuthUserResponse)
def register(payload: RegisterRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    is_first = db.query(User).count() == 0
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=UserRole.admin if is_first else UserRole.user
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _set_auth_cookie(response, create_token_for_user(user, db, request))
    return _auth_user_response(user)


# ── Login ─────────────────────────────────────────────────────────

@router.post("/login", response_model=AuthUserResponse)
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
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
                user_id = int(user_id)
            except (ValueError, TypeError):
                user_id = None

            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user and (not session_id or user.current_session_id == session_id):
                    user.current_session_id = None
                    db.commit()

    _clear_auth_cookie(response)
    return {"message": "Logged out"}


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
        "created_at": current_user.created_at
    }
