# PDF Parser Notes

## Supported Structures

The parser is deterministic and layout-agnostic. It supports common exam formats such as:

- `Q.1 ...`, `Q1 ...`, `Question 1 ...`
- `1. [MCQ] ...`
- `[MSQ] 1. ...`
- `Q.1 MCQ | +2 -0`
- `Q.1 NAT | +1 -0`
- question types written as `MCQ`, `MSQ`, `NAT`, `Single correct`, `Multiple correct`, or `Numerical answer type`
- options written as `(a)`, `(A)`, `a)`, `A.`, and options split across lines or compacted onto one line
- inline answer lines such as `Answer: B` or `Correct Answer: A;C`
- separate `Answer Key` / `Answers` / `Solutions` sections with numbered answers
- NAT answers as numbers, decimals, negative numbers, ranges, or comma/semicolon-separated accepted values
- marks written as `+2 -0.67`, `[2 marks]`, `(1 mark)`, or range rules like `Q.1 to Q.5 carry one mark each`

## Pipeline

`extract_questions_from_pdf()` runs these stages:

1. Extract text page by page using `pdfplumber`, falling back to PyMuPDF.
2. Normalize text and line endings.
3. Select structural parser profiles from document patterns.
4. Parse answer key / solutions sections.
5. Parse section-level marks rules.
6. Detect question blocks and preserve page, section, local number, and global number.
7. Parse question type, marks, options, inline answers, and answer-key answers.
8. Validate each question and attach warnings.
9. Assign confidence and `needs_review`.
10. Return app-compatible question dictionaries with optional metadata.

## Confidence

Confidence is a `0.0` to `1.0` score based on:

- question text presence
- explicit question type
- expected options for MCQ/MSQ
- valid answer shape
- marks found or defaulted
- obvious parsing problems

Questions below `0.7` get `low_confidence` and `needs_review`.

## Review Warnings

Common warnings include:

- `missing_answer`
- `missing_options`
- `too_few_options`
- `too_many_options`
- `nat_has_non_numeric_answer`
- `mcq_has_multiple_answers`
- `msq_has_single_answer_but_allowed`
- `image_context_required`
- `duplicate_question_number_in_same_section`
- `low_confidence`

The parser never guesses missing answers. Missing answers are returned as an empty string with `missing_answer`.

## Upload Behavior

The parser can return low-confidence questions for review, but the current database schema has no columns for parser review metadata. The admin PDF upload endpoint therefore rejects PDFs containing review-needed questions instead of saving uncertain questions into a live test.

## Limitations

- It does not perform OCR.
- It does not extract embedded diagrams or rendered page images.
- Two-column text is handled only when the PDF text extraction preserves option markers.
- Ambiguous answer keys with repeated question numbers may require manual review.
- Image-dependent questions are flagged with `has_image` / `image_context_required`; image extraction can be added later using existing question image fields.

## Adding Patterns

Add structural support by extending regexes in `pdf_service.py`:

- question starts: `_parse_question_boundary`
- type aliases: `TYPE_ALIASES`
- answer key pairs: `ANSWER_PAIR_RE` / `ANSWER_PAIR_SPACE_RE`
- marks: `MARKS_INLINE_RE`, `MARKS_WORD_RE`, `MARK_RULE_RE`
- image-context phrases: `IMAGE_CONTEXT_RE`

Add synthetic fixtures in `backend/tests/test_pdf_service.py` for every new pattern.
