import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.auth import router
from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.models.models import User, UserRole


class AuthCookieTests(unittest.TestCase):
    def setUp(self):
        self.original_cookie_secure = settings.AUTH_COOKIE_SECURE
        settings.AUTH_COOKIE_SECURE = True
        self.addCleanup(self._restore_cookie_secure)

        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

        db = self.SessionLocal()
        try:
            self.user = User(
                email="user@example.com",
                full_name="Cookie User",
                hashed_password=hash_password("secret123"),
                role=UserRole.aspirant,
                is_active=True,
            )
            db.add(self.user)
            db.commit()
            db.refresh(self.user)
            self.user_id = self.user.id
        finally:
            db.close()

        app = FastAPI()
        app.include_router(router)

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app, base_url="https://testserver")

    def _restore_cookie_secure(self):
        settings.AUTH_COOKIE_SECURE = self.original_cookie_secure

    def test_login_sets_httponly_cookie_without_returning_access_token(self):
        response = self.client.post(
            "/auth/login",
            json={"email": "user@example.com", "password": "secret123"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("access_token", response.json())

        set_cookie = response.headers["set-cookie"]
        self.assertIn(f"{settings.AUTH_COOKIE_NAME}=", set_cookie)
        self.assertIn("HttpOnly", set_cookie)
        self.assertIn("Secure", set_cookie)
        self.assertIn("samesite=none", set_cookie.lower())

        me = self.client.get("/auth/me")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["id"], self.user_id)

    def test_logout_clears_cookie_and_invalidates_current_session(self):
        self.client.post(
            "/auth/login",
            json={"email": "user@example.com", "password": "secret123"},
        )

        response = self.client.post("/auth/logout")

        self.assertEqual(response.status_code, 200)
        self.assertIn(f"{settings.AUTH_COOKIE_NAME}=", response.headers["set-cookie"])
        self.assertIn("Max-Age=0", response.headers["set-cookie"])

        me = self.client.get("/auth/me")
        self.assertEqual(me.status_code, 401)

        db = self.SessionLocal()
        try:
            user = db.query(User).filter(User.id == self.user_id).one()
            self.assertIsNone(user.current_session_id)
        finally:
            db.close()

    def test_cookie_auth_rejects_legacy_token_without_cookie_marker(self):
        session_id = "legacy-session"
        db = self.SessionLocal()
        try:
            user = db.query(User).filter(User.id == self.user_id).one()
            user.current_session_id = session_id
            db.commit()
        finally:
            db.close()

        legacy_token = create_access_token({
            "sub": self.user_id,
            "role": UserRole.aspirant,
            "sid": session_id,
        })
        response = self.client.get(
            "/auth/me",
            headers={"Cookie": f"{settings.AUTH_COOKIE_NAME}={legacy_token}"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid token")


if __name__ == "__main__":
    unittest.main()
