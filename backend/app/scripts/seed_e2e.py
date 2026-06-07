import os

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.models import User, UserRole


def _upsert_user(db, *, email: str, full_name: str, password: str, role: UserRole) -> None:
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(email=email, full_name=full_name)
        db.add(user)

    user.full_name = full_name
    user.hashed_password = hash_password(password)
    user.role = role
    user.is_active = True
    user.current_session_id = None
    user.current_ip = None


def main() -> None:
    Base.metadata.create_all(bind=engine)

    admin_email = os.getenv("E2E_ADMIN_EMAIL", "e2e-admin@example.com")
    admin_password = os.getenv("E2E_ADMIN_PASSWORD", "testpassword")
    test_email = os.getenv("TEST_USER_EMAIL", "test@example.com")
    test_password = os.getenv("TEST_USER_PASSWORD", "testpassword")

    if admin_email == test_email:
        raise SystemExit("E2E admin and test user emails must be different.")

    with SessionLocal() as db:
        _upsert_user(
            db,
            email=admin_email,
            full_name="E2E Admin",
            password=admin_password,
            role=UserRole.admin,
        )
        _upsert_user(
            db,
            email=test_email,
            full_name="Test User",
            password=test_password,
            role=UserRole.aspirant,
        )
        db.commit()

    print(f"Seeded E2E users: {admin_email}, {test_email}")


if __name__ == "__main__":
    main()
