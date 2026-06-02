import unittest

from app.api.routes.admin import _pdf_review_detail


class AdminPDFReviewTests(unittest.TestCase):
    def test_non_blocking_review_warnings_do_not_reject_import(self):
        detail = _pdf_review_detail([
            {
                "question_number": 1,
                "needs_review": True,
                "warnings": ["image_context_required", "low_confidence"],
                "correct_answer": "A",
            }
        ])

        self.assertEqual(detail, "")

    def test_blocking_warnings_are_reported_with_question_numbers(self):
        detail = _pdf_review_detail([
            {
                "question_number": 1,
                "needs_review": True,
                "warnings": ["missing_answer", "low_confidence"],
                "correct_answer": "",
            },
            {
                "question_number": 2,
                "needs_review": True,
                "warnings": ["too_few_options"],
                "correct_answer": "B",
            },
        ])

        self.assertIn("2 have blocking issues", detail)
        self.assertIn("Q1: missing_answer", detail)
        self.assertIn("Q2: too_few_options", detail)


if __name__ == "__main__":
    unittest.main()
