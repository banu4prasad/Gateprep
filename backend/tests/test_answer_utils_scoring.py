import unittest

from app.models.models import Question
from app.services.answer_utils import is_valid_nat_answer, parse_nat_range
from app.services.scoring import evaluate_answer


class AnswerUtilsScoringTests(unittest.TestCase):
    def test_nat_colon_range_is_valid(self):
        self.assertEqual(parse_nat_range("0.44:0.45"), (0.44, 0.45))
        self.assertTrue(is_valid_nat_answer("0.44:0.45"))

    def test_nat_colon_range_scores_boundary_values(self):
        question = Question(
            question_type="nat",
            question_text="Probability",
            options=[],
            correct_answer="0.44:0.45",
            marks=2.0,
            negative_marks=0.0,
        )

        for selected in ("0.44", "0.445", "0.45"):
            with self.subTest(selected=selected):
                self.assertEqual(evaluate_answer(question, selected), (True, 2.0))

        self.assertEqual(evaluate_answer(question, "0.46"), (False, 0.0))

    def test_nat_hyphen_negative_range_still_works(self):
        self.assertEqual(parse_nat_range("-2--1"), (-2.0, -1.0))
        self.assertTrue(is_valid_nat_answer("-2--1"))


if __name__ == "__main__":
    unittest.main()
