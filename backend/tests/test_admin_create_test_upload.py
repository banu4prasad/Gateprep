import os
import tempfile
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import require_admin
from app.api.routes.admin import router
from app.core.config import settings
from app.core.database import Base, get_db
from app.models.models import Test, User, UserRole


class AdminCreateTestUploadTests(unittest.TestCase):
    def setUp(self):
        self.original_upload_dir = settings.UPLOAD_DIR
        self.upload_dir = tempfile.TemporaryDirectory()
        settings.UPLOAD_DIR = self.upload_dir.name
        self.addCleanup(self.upload_dir.cleanup)
        self.addCleanup(self._restore_upload_dir)

        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

        db = self.SessionLocal()
        try:
            self.admin = User(email="admin@example.com", full_name="Admin", role=UserRole.admin)
            db.add(self.admin)
            db.commit()
            db.refresh(self.admin)
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

        def override_require_admin():
            return self.admin

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_admin] = override_require_admin
        self.client = TestClient(app)

    def _restore_upload_dir(self):
        settings.UPLOAD_DIR = self.original_upload_dir

    def test_create_test_uses_uuid_pdf_filename_for_traversal_upload_name(self):
        extracted_questions = [
            {
                "question_type": "mcq",
                "question_text": "Pick one.",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "A",
                "marks": 1.0,
                "negative_marks": 0.33,
            }
        ]

        with patch("app.api.routes.admin.extract_questions_from_pdf", return_value=extracted_questions) as extract:
            response = self.client.post(
                "/admin/tests",
                data={"title": "Traversal test"},
                files={
                    "pdf_file": (
                        "../../../etc/cron.d/malicious.pdf",
                        b"%PDF-1.4",
                        "application/pdf",
                    )
                },
            )

        self.assertEqual(response.status_code, 201)

        db = self.SessionLocal()
        try:
            test = db.query(Test).one()
            self.assertRegex(test.pdf_filename, r"^[0-9a-f]{32}\.pdf$")
            self.assertNotIn("malicious", test.pdf_filename)
            self.assertNotIn("..", test.pdf_filename)
            saved_path = os.path.join(settings.UPLOAD_DIR, test.pdf_filename)
            self.assertTrue(os.path.isfile(saved_path))
            self.assertEqual(os.path.dirname(os.path.abspath(saved_path)), os.path.abspath(settings.UPLOAD_DIR))
        finally:
            db.close()

        extract.assert_called_once()
        extracted_path = extract.call_args.args[0]
        self.assertRegex(os.path.basename(extracted_path), r"^[0-9a-f]{32}\.pdf$")
        self.assertEqual(os.path.dirname(os.path.abspath(extracted_path)), os.path.abspath(settings.UPLOAD_DIR))

    def test_create_test_rejects_pdf_upload_over_size_limit_and_removes_partial_file(self):
        with (
            patch("app.api.routes.admin.MAX_PDF_UPLOAD_SIZE_BYTES", 8),
            patch("app.api.routes.admin.extract_questions_from_pdf") as extract,
        ):
            response = self.client.post(
                "/admin/tests",
                data={"title": "Oversized PDF"},
                files={"pdf_file": ("oversized.pdf", b"%PDF-1.4 oversized", "application/pdf")},
            )

        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json()["detail"], "File too large")
        extract.assert_not_called()
        self.assertEqual(os.listdir(settings.UPLOAD_DIR), [])

        db = self.SessionLocal()
        try:
            self.assertEqual(db.query(Test).count(), 0)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
