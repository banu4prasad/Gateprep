import unittest

from app.services.pdf_service import _parse_gate_questions


class PDFServiceParserTests(unittest.TestCase):
    def test_q_dot_format_with_inline_answer(self):
        questions = _parse_gate_questions(
            """
            Q.1 MCQ | +1 -0.33
            Choose the true statement.
            A. one
            B. two
            C. three
            D. four
            Answer: B
            """
        )

        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0]["question_type"], "mcq")
        self.assertEqual(questions[0]["correct_answer"], "B")
        self.assertEqual(questions[0]["negative_marks"], 0.33)
        self.assertFalse(questions[0]["needs_review"])

    def test_numbered_mcq_format(self):
        questions = _parse_gate_questions(
            """
            1. [MCQ] Which option is correct?
            (a) alpha
            (b) beta
            (c) gamma
            (d) delta
            Correct Answer: c
            """
        )

        self.assertEqual(questions[0]["question_type"], "mcq")
        self.assertEqual(questions[0]["options"], ["alpha", "beta", "gamma", "delta"])
        self.assertEqual(questions[0]["correct_answer"], "C")

    def test_type_before_number_format(self):
        questions = _parse_gate_questions(
            """
            [MSQ] 1. Select valid propositions.
            A. p implies q
            B. q implies p
            C. p iff q
            D. not p
            Correct Answer: A;C
            """
        )

        self.assertEqual(questions[0]["question_type"], "msq")
        self.assertEqual(questions[0]["correct_answer"], "A,C")

    def test_separate_answer_key_is_merged(self):
        questions = _parse_gate_questions(
            """
            Q.1 MCQ | +1 -0.33
            Choose.
            A. x
            B. y
            C. z
            D. w
            Q.2 MSQ | +2 -0
            Pick all.
            A. a
            B. b
            C. c
            D. d
            Answer Key
            1. B
            2. A;C
            """
        )

        self.assertEqual([q["correct_answer"] for q in questions], ["B", "A,C"])
        self.assertEqual(questions[1]["question_type"], "msq")

    def test_choice_answers_with_option_prefix_and_explanations(self):
        questions = _parse_gate_questions(
            """
            Q.1 MCQ | +1 -0.33
            Choose.
            A. x
            B. y
            C. z
            D. w
            Answer: Option B
            Q.2 MCQ | +1 -0.33
            Choose again.
            A. x
            B. y
            C. z
            D. w
            Correct Answer: C. because z is correct
            Q.3 MSQ | +2 -0
            Pick all.
            A. a
            B. b
            C. c
            D. d
            Answer: A and C are correct
            """
        )

        self.assertEqual([q["correct_answer"] for q in questions], ["B", "C", "A,C"])
        self.assertFalse(any("invalid_choice_answer" in q["warnings"] for q in questions))

    def test_multiple_choice_answer_overrides_mcq_header(self):
        questions = _parse_gate_questions(
            """
            Q.1 MCQ | +1 -0.33
            Select the true statements.
            A. true
            B. false
            C. also true
            D. also also true
            Correct Answer: A;C;D Discuss
            """
        )

        self.assertEqual(questions[0]["question_type"], "msq")
        self.assertEqual(questions[0]["correct_answer"], "A,C,D")
        self.assertNotIn("mcq_has_multiple_answers", questions[0]["warnings"])

    def test_option_text_before_label_is_recovered(self):
        questions = _parse_gate_questions(
            """
            Q.1 MCQ | +1 -0.33
            If expression is false, values are respectively:
            F,T,F
            A.
            T,F,T
            B.
            T,T,T
            C.
            F,F,F
            D.
            Correct Answer: B Discuss
            Q.2 MCQ | +2 -0.67
            Identify expression.
            X$Y
            A.
            X$¬Y
            B.
            ¬X$Y
            C.
            D. none of the options
            Correct Answer: D Discuss
            """
        )

        self.assertEqual(questions[0]["options"], ["F,T,F", "T,F,T", "T,T,T", "F,F,F"])
        self.assertEqual(questions[1]["options"], ["X$Y", "X$¬Y", "¬X$Y", "none of the options"])
        self.assertFalse(any("too_few_options" in q["warnings"] for q in questions))

    def test_nat_numeric_answer_and_range(self):
        questions = _parse_gate_questions(
            """
            Q1 NAT | +2 -0
            The value is ____.
            Answer: -2--1
            Q2 Numerical answer type | +1 -0
            Enter the count.
            Answer: 4,5
            """
        )

        self.assertEqual([q["question_type"] for q in questions], ["nat", "nat"])
        self.assertEqual(questions[0]["correct_answer"], "-2--1")
        self.assertEqual(questions[1]["correct_answer"], "4,5")
        self.assertFalse(questions[0]["needs_review"])

    def test_nat_answer_with_units_is_normalized(self):
        questions = _parse_gate_questions(
            """
            Q.1 NAT | +1 -0
            Count the valid rows.
            Answer: 4 combinations
            Q.2 NAT | +1 -0
            Give the accepted interval.
            Correct Answer: -2 to -1 approximately
            """
        )

        self.assertEqual([q["correct_answer"] for q in questions], ["4", "-2--1"])
        self.assertFalse(any("nat_has_non_numeric_answer" in q["warnings"] for q in questions))

    def test_marks_from_section_range(self):
        questions = _parse_gate_questions(
            """
            Q.1 to Q.5 carry one mark each
            Q.1 MCQ
            Choose.
            A. a
            B. b
            C. c
            D. d
            Answer: A
            """
        )

        self.assertEqual(questions[0]["marks"], 1.0)

    def test_missing_answer_is_not_guessed_as_a(self):
        questions = _parse_gate_questions(
            """
            Q.1 MCQ | +1 -0.33
            Choose.
            A. a
            B. b
            C. c
            D. d
            """
        )

        self.assertEqual(questions[0]["correct_answer"], "")
        self.assertIn("missing_answer", questions[0]["warnings"])
        self.assertTrue(questions[0]["needs_review"])

    def test_repeated_question_numbers_across_sections(self):
        questions = _parse_gate_questions(
            """
            SECTION A
            Q.1 MCQ
            Choose A.
            A. a
            B. b
            C. c
            D. d
            Answer: A
            SECTION B
            Q.1 MCQ
            Choose B.
            A. a
            B. b
            C. c
            D. d
            Answer: B
            """
        )

        self.assertEqual(len(questions), 2)
        self.assertEqual([q["global_question_number"] for q in questions], [1, 2])
        self.assertEqual([q["correct_answer"] for q in questions], ["A", "B"])

    def test_image_context_and_low_confidence_detection(self):
        questions = _parse_gate_questions(
            """
            Q.1 MCQ
            In the following figure, choose the output.
            A. zero
            B. one
            Answer: A
            """
        )

        self.assertTrue(questions[0]["has_image"])
        self.assertIn("image_context_required", questions[0]["warnings"])
        self.assertIn("too_few_options", questions[0]["warnings"])
        self.assertTrue(questions[0]["needs_review"])


if __name__ == "__main__":
    unittest.main()
