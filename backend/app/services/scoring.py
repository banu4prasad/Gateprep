"""
Scoring Engine
==============
MCQ:  +marks if correct, -negative_marks if wrong, 0 if skipped
MSQ:  +marks only if ALL correct options selected exactly, 0 otherwise (no negative)
NAT:  +marks if answer in range (or exact match), 0 otherwise (no negative)
"""
from typing import Optional
from app.models.models import Question
from app.services.answer_utils import (
    normalize_question_type,
    parse_float,
    parse_nat_range,
    split_answer_tokens,
)


def evaluate_answer(question: Question, selected: Optional[str]) -> tuple[bool | None, float]:
    """
    Returns (is_correct, marks_awarded).
    is_correct: True / False / None (skipped)
    """
    if selected is None or selected.strip() == "":
        return None, 0.0  # skipped

    q_type = normalize_question_type(question.question_type)
    correct = question.correct_answer.strip().upper()
    given = selected.strip().upper()
    question_marks = parse_float(question.marks) or 0.0
    negative_marks = parse_float(question.negative_marks) or 0.0

    if q_type == "mcq":
        is_correct = given == correct
        marks = question_marks if is_correct else -negative_marks
        return is_correct, round(marks, 2)

    elif q_type == "msq":
        correct_set = set(c.upper() for c in split_answer_tokens(correct))
        given_set = set(c.upper() for c in split_answer_tokens(given))
        is_correct = correct_set == given_set
        marks = question_marks if is_correct else 0.0  # no negative for MSQ
        return is_correct, round(marks, 2)

    elif q_type == "nat":
        # Correct answer can be exact "42" or range "41.5-42.5"
        given_val = parse_float(given)
        if given_val is None:
            return False, 0.0

        is_correct = False
        for accepted in split_answer_tokens(correct):
            bounds = parse_nat_range(accepted)
            if bounds:
                lo, hi = bounds
                if lo <= given_val <= hi:
                    is_correct = True
                    break
                continue

            # Exact (allow +/-0.01 tolerance for floating point)
            expected = parse_float(accepted)
            if expected is None:
                continue
            if abs(given_val - expected) <= 0.01:
                is_correct = True
                break

        marks = question_marks if is_correct else 0.0
        return is_correct, round(marks, 2)

    return False, 0.0
