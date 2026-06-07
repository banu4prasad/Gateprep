import os
import tempfile
import pytest
from app.services.pdf_service import extract_questions_from_pdf, _parse_gate_questions

def _write_temp_file(content: bytes, suffix: str = ".pdf") -> str:
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.write(fd, content)
    os.close(fd)
    return path

def _create_empty_pdf() -> str:
    import fitz
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    doc = fitz.open()
    doc.new_page()
    doc.save(path)
    doc.close()
    return path

def _create_pdf_with_text(text: str) -> str:
    import fitz
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), text, fontsize=10)
    doc.save(path)
    doc.close()
    return path

def test_non_existent_file():
    assert extract_questions_from_pdf("/path/does/not/exist.pdf") == []

def test_corrupted_pdf_file():
    path = _write_temp_file(b"This is not a pdf file")
    try:
        assert extract_questions_from_pdf(path) == []
    finally:
        os.remove(path)

def test_empty_pdf():
    path = _create_empty_pdf()
    try:
        assert extract_questions_from_pdf(path) == []
    finally:
        os.remove(path)

def test_pdf_with_only_whitespace():
    path = _create_pdf_with_text("   \n   \t   ")
    try:
        assert extract_questions_from_pdf(path) == []
    finally:
        os.remove(path)

def test_very_long_question_text():
    long_text = "A" * 15000
    questions = _parse_gate_questions(f"Q.1 MCQ\n{long_text}\nA. a\nB. b\nC. c\nD. d\nAnswer: A")
    assert len(questions) == 1
    assert questions[0]["question_text"] == long_text

def test_pdf_with_special_unicode_characters():
    text = "Q.1 MCQ\nCompute α + β ≈ 10.\nA. 10\nB. 20\nC. 30\nD. 40\nAnswer: A"
    questions = _parse_gate_questions(text)
    assert len(questions) == 1
    assert "α + β ≈ 10." in questions[0]["question_text"]

def test_mixed_question_types():
    text = """
    Q.1 MCQ | +1 -0.33
    Choose.
    A. a
    B. b
    C. c
    D. d
    Answer: A
    Q.2 MSQ | +2 -0
    Choose all.
    A. a
    B. b
    C. c
    D. d
    Answer: A,B
    Q.3 NAT | +2 -0
    Enter value.
    Answer: 42
    """
    questions = _parse_gate_questions(text)
    assert len(questions) == 3
    assert questions[0]["question_type"] == "mcq"
    assert questions[1]["question_type"] == "msq"
    assert questions[2]["question_type"] == "nat"

def test_missing_answer_keys():
    text = """
    Q.1 MCQ
    Choose.
    A. a
    B. b
    C. c
    D. d
    """
    questions = _parse_gate_questions(text)
    assert len(questions) == 1
    assert questions[0]["needs_review"] == True
    assert "missing_answer" in questions[0]["warnings"]

def test_duplicate_question_numbers():
    text = """
    SECTION 1
    Q.1 MCQ
    A. a
    B. b
    C. c
    D. d
    Answer: A
    SECTION 2
    Q.1 MCQ
    A. a
    B. b
    C. c
    D. d
    Answer: B
    """
    questions = _parse_gate_questions(text)
    assert len(questions) == 2
    assert questions[0]["global_question_number"] == 1
    assert questions[1]["global_question_number"] == 2

def test_malformed_option_labels():
    text = """
    Q.1 MCQ
    Find value.
    (a) first
    (b) second
    (c) third
    (d) fourth
    Answer: A
    """
    questions = _parse_gate_questions(text)
    assert len(questions) == 1
    assert questions[0]["options"] == ["first", "second", "third", "fourth"]
