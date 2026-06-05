from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.models.models import User, UserRole

def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("auth") != "cookie":
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    session_id = payload.get("sid")

    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Single session check — token must match the currently stored session.
    if not session_id or user.current_session_id != session_id:
        raise HTTPException(
            status_code=401,
            detail="Session expired. You logged in from another device."
        )

    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def require_aspirant(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.admin, UserRole.aspirant):
        raise HTTPException(status_code=403, detail="Access restricted to approved aspirants")
    return current_user
