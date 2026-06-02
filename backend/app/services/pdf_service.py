"""
Deterministic PDF question extraction.

The public entry point remains extract_questions_from_pdf(pdf_path). Internally
the parser runs a staged pipeline: page text extraction, normalization, profile
detection, section/question block detection, answer-key extraction, question
field parsing, validation, confidence scoring, and compatibility shaping.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.services.answer_utils import (
    is_valid_nat_answer,
    normalize_choice_answer,
    parse_float,
    split_answer_tokens,
)

logger = logging.getLogger(__name__)

DEFAULT_MARKS = {"mcq": 1.0, "msq": 2.0, "nat": 2.0}
DEFAULT_NEGATIVE = {"mcq": 0.33, "msq": 0.0, "nat": 0.0}

TYPE_ALIASES = [
    (re.compile(r"\bMSQ\b|\bmultiple\s+correct\b", re.IGNORECASE), "msq"),
    (re.compile(r"\bNAT\b|\bnumerical\s+answer(?:\s+type)?\b", re.IGNORECASE), "nat"),
    (re.compile(r"\bMCQ\b|\bsingle\s+correct\b", re.IGNORECASE), "mcq"),
]
TYPE_TOKEN_RE = r"(?:MCQ|MSQ|NAT|single\s+correct|multiple\s+correct|numerical\s+answer(?:\s+type)?)"
QUESTION_HEADER_RE = re.compile(
    rf"^\s*(?:\[?\s*(?P<type>{TYPE_TOKEN_RE})\s*\]?)?"
    r"\s*(?:\|\s*)?"
    r"(?:(?:\+?(?P<marks>\d+(?:\.\d+)?)\s*-\s*(?P<negative>\d+(?:\.\d+)?))|"
    r"(?P<bracket_marks>[\[(]\s*\d+(?:\.\d+)?\s*marks?\s*[\])]))?"
    r"\s*(?P<rest>.*)$",
    re.IGNORECASE,
)
Q_PREFIX_RE = re.compile(r"^\s*(?:Q\.?\s*|Question\s+)(?P<num>\d{1,4})\s*[\).:\-]?\s*(?P<rest>.*)$", re.IGNORECASE)
TYPE_BEFORE_NUM_RE = re.compile(
    rf"^\s*\[?\s*(?P<type>{TYPE_TOKEN_RE})\s*\]?\s*"
    r"(?:Q\.?\s*|Question\s+)?(?P<num>\d{1,4})\s*[\).:\-]?\s*(?P<rest>.*)$",
    re.IGNORECASE,
)
NUMBERED_RE = re.compile(r"^\s*(?P<num>\d{1,4})\s*[\).:]\s*(?P<rest>.*)$")
OPTION_MARKER_RE = re.compile(r"(?<![A-Za-z0-9])(?:[\(\[]\s*([A-Da-d])\s*[\)\]]|([A-Da-d])[\).])\s*")
ANSWER_LINE_RE = re.compile(r"\b(?:Correct\s+Answer|Answer|Ans)\s*[:.)\-]\s*(?P<answer>.+)$", re.IGNORECASE)
ANSWER_KEY_TITLE_RE = re.compile(r"^\s*(?:answer\s*key|answers?|solutions?)\s*[:\-]?\s*$", re.IGNORECASE)
ANSWER_VALUE_RE = (
    r"(?:[A-Da-d](?:\s*[,;/]\s*[A-Da-d])*|"
    r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?"
    r"(?:\s*-\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)?"
    r"(?:\s*[,;/]\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?"
    r"(?:\s*-\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)?)*)"
)
ANSWER_PAIR_RE = re.compile(
    rf"(?:Q\.?\s*|Question\s+)?(?P<num>\d{{1,4}})\s*[\).:\-]\s*"
    rf"(?:(?:Correct\s+Answer|Answer|Ans)\s*[:\-]?\s*)?(?P<answer>{ANSWER_VALUE_RE})(?=\s|$)",
    re.IGNORECASE,
)
ANSWER_PAIR_SPACE_RE = re.compile(
    rf"(?:Q\.?\s*|Question\s+)?(?P<num>\d{{1,4}})\s+"
    rf"(?:(?:Correct\s+Answer|Answer|Ans)\s*[:\-]?\s*)?(?P<answer>{ANSWER_VALUE_RE})(?=\s|$)",
    re.IGNORECASE,
)
SOLUTION_ANSWER_RE = re.compile(
    rf"\b(?:Solution|Sol)\s*(?P<num>\d{{1,4}})\b.*?"
    rf"(?:(?:Correct\s+Answer|Answer|Ans)\s*[:\-]?\s*)?(?P<answer>{ANSWER_VALUE_RE})(?=\s|$)",
    re.IGNORECASE,
)
MARKS_INLINE_RE = re.compile(r"\+?(?P<marks>\d+(?:\.\d+)?)\s*-\s*(?P<negative>\d+(?:\.\d+)?)")
MARKS_WORD_RE = re.compile(r"[\[(]\s*(?P<marks>\d+(?:\.\d+)?)\s*marks?\s*[\])]", re.IGNORECASE)
MARK_RULE_RE = re.compile(
    r"(?:Q\.?\s*)?(?P<start>\d{1,4})\s*(?:to|\-|through)\s*(?:Q\.?\s*)?(?P<end>\d{1,4})"
    r".*?\bcarry\s+(?P<marks>one|two|three|four|five|\d+(?:\.\d+)?)\s+marks?\s+each",
    re.IGNORECASE,
)
IMAGE_CONTEXT_RE = re.compile(
    r"\b(following\s+(?:figure|diagram)|shown\s+below|given\s+circuit|truth\s+table|"
    r"hasse\s+diagram|automaton|graph)\b",
    re.IGNORECASE,
)

WORD_NUMBERS = {"one": 1.0, "two": 2.0, "three": 3.0, "four": 4.0, "five": 5.0}
REVIEW_WARNINGS = {
    "missing_answer",
    "missing_options",
    "too_few_options",
    "too_many_options",
    "nat_has_non_numeric_answer",
    "mcq_has_multiple_answers",
    "image_context_required",
    "duplicate_question_number_in_same_section",
    "ambiguous_answer_key",
    "low_confidence",
}


@dataclass
class PageText:
    page_number: int
    text: str


@dataclass
class SourceLine:
    text: str
    page_number: int
    index: int


@dataclass
class QuestionBoundary:
    number: int
    declared_type: Optional[str]
    rest: str


@dataclass
class QuestionBlock:
    question_number: int
    global_question_number: int
    section_title: Optional[str]
    source_page_start: int
    source_page_end: int
    declared_type: Optional[str]
    lines: List[SourceLine] = field(default_factory=list)
    occurrence_index: int = 1


@dataclass
class MarkRule:
    start: int
    end: int
    marks: float


@dataclass
class AnswerKeys:
    by_number: Dict[int, List[str]] = field(default_factory=dict)
    by_section: Dict[tuple[str, int], List[str]] = field(default_factory=dict)
    line_indexes: set[int] = field(default_factory=set)


def extract_questions_from_pdf(pdf_path: str) -> List[Dict[str, Any]]:
    pages = _extract_pages(pdf_path)
    if not any(page.text.strip() for page in pages):
        logger.error("Could not extract any text from PDF")
        return []

    questions = _parse_pages(pages, source_filename=os.path.basename(pdf_path))
    return questions


def _extract_text(pdf_path: str) -> str:
    return "\n".join(page.text for page in _extract_pages(pdf_path))


def _extract_pages(pdf_path: str) -> List[PageText]:
    """Extract text page by page using existing PDF libraries."""
    try:
        import pdfplumber

        with pdfplumber.open(pdf_path) as pdf:
            pages = [PageText(i + 1, page.extract_text() or "") for i, page in enumerate(pdf.pages)]
            if any(page.text.strip() for page in pages):
                logger.info("Extracted %s pages with pdfplumber", len(pages))
                return pages
    except Exception as exc:
        logger.warning("pdfplumber failed: %s", exc)

    try:
        import fitz

        doc = fitz.open(pdf_path)
        pages = [PageText(i + 1, page.get_text() or "") for i, page in enumerate(doc)]
        doc.close()
        logger.info("Extracted %s pages with PyMuPDF", len(pages))
        return pages
    except Exception as exc:
        logger.warning("PyMuPDF failed: %s", exc)

    return []


def _parse_gate_questions(text: str) -> List[Dict[str, Any]]:
    """Compatibility helper used by tests and older call sites."""
    return _parse_pages([PageText(1, text)], source_filename=None)


def _parse_pages(pages: List[PageText], source_filename: Optional[str]) -> List[Dict[str, Any]]:
    normalized_pages = [PageText(page.page_number, _normalize_text(page.text)) for page in pages]
    lines = _page_lines(normalized_pages)
    profiles = _select_profiles(lines)
    answer_keys = _parse_answer_key_sections(lines)
    mark_rules = _parse_mark_rules(lines)
    blocks = _detect_question_blocks(lines, answer_keys.line_indexes)

    question_number_counts: Dict[int, int] = {}
    for block in blocks:
        question_number_counts[block.question_number] = question_number_counts.get(block.question_number, 0) + 1

    seen_in_section: set[tuple[str, int]] = set()
    questions: List[Dict[str, Any]] = []
    for block in blocks:
        parsed = _parse_question_block(block, answer_keys, mark_rules, question_number_counts, source_filename)
        duplicate_key = (parsed.get("section_title") or "", parsed["question_number"])
        duplicate = duplicate_key in seen_in_section
        seen_in_section.add(duplicate_key)
        questions.append(_validate_and_score(parsed, duplicate=duplicate))

    needs_review = sum(1 for question in questions if question.get("needs_review"))
    logger.info("Selected PDF parser profile(s): %s", ", ".join(profiles) if profiles else "generic_profile")
    logger.info("PDF parser pages extracted: %s", len(pages))
    logger.info("PDF parser sections detected: %s", len({q.get("section_title") for q in questions if q.get("section_title")}))
    logger.info("PDF parser question blocks detected: %s", len(blocks))
    logger.info("PDF parser answers detected: %s", sum(len(v) for v in answer_keys.by_number.values()))
    logger.info("PDF parser questions returned: %s", len(questions))
    logger.info("PDF parser questions needing review: %s", needs_review)
    return questions


def _normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("\u2212", "-")
    text = text.replace("\u00a0", " ")
    return text


def _page_lines(pages: List[PageText]) -> List[SourceLine]:
    lines: List[SourceLine] = []
    index = 0
    for page in pages:
        for raw in page.text.split("\n"):
            lines.append(SourceLine(raw.strip(), page.page_number, index))
            index += 1
    return lines


def _select_profiles(lines: List[SourceLine]) -> List[str]:
    profiles: List[str] = []
    text = "\n".join(line.text for line in lines)
    if ANSWER_KEY_TITLE_RE.search(text):
        profiles.append("separate_answer_key_profile")
    if ANSWER_LINE_RE.search(text):
        profiles.append("inline_answer_profile")
    if any(_parse_question_boundary(line.text) and _extract_question_type(line.text) for line in lines):
        profiles.append("typed_numbered_question_profile")
    if any(len(list(OPTION_MARKER_RE.finditer(line.text))) > 1 for line in lines):
        profiles.append("compact_question_profile")
    return profiles or ["generic_numbered_question_profile"]


def _parse_answer_key_sections(lines: List[SourceLine]) -> AnswerKeys:
    keys = AnswerKeys()
    in_key = False
    current_section: Optional[str] = None

    for line in lines:
        text = line.text.strip()
        if not text:
            if in_key:
                keys.line_indexes.add(line.index)
            continue

        if ANSWER_KEY_TITLE_RE.match(text):
            in_key = True
            current_section = None
            keys.line_indexes.add(line.index)
            continue

        if not in_key:
            solution_match = SOLUTION_ANSWER_RE.search(text)
            if solution_match:
                _store_answer(keys, int(solution_match.group("num")), _clean_answer_value(solution_match.group("answer")), None)
            continue

        keys.line_indexes.add(line.index)
        if _looks_section_title(text):
            current_section = text

        for q_num, answer in _extract_answer_pairs(text):
            _store_answer(keys, q_num, answer, current_section)

    return keys


def _store_answer(keys: AnswerKeys, q_num: int, answer: str, section_title: Optional[str]) -> None:
    if not answer:
        return
    keys.by_number.setdefault(q_num, []).append(answer)
    if section_title:
        keys.by_section.setdefault((section_title, q_num), []).append(answer)


def _extract_answer_pairs(text: str) -> List[tuple[int, str]]:
    pairs: List[tuple[int, str]] = []
    for pattern in (ANSWER_PAIR_RE, ANSWER_PAIR_SPACE_RE):
        for match in pattern.finditer(text):
            q_num = int(match.group("num"))
            answer = _clean_answer_value(match.group("answer"))
            if answer:
                pairs.append((q_num, answer))
        if pairs:
            break
    return pairs


def _parse_mark_rules(lines: List[SourceLine]) -> List[MarkRule]:
    rules: List[MarkRule] = []
    for line in lines:
        match = MARK_RULE_RE.search(line.text)
        if not match:
            continue
        raw_marks = match.group("marks").lower()
        marks = WORD_NUMBERS.get(raw_marks, parse_float(raw_marks))
        if marks is not None:
            rules.append(MarkRule(int(match.group("start")), int(match.group("end")), marks))
    return rules


def _detect_question_blocks(lines: List[SourceLine], answer_key_line_indexes: set[int]) -> List[QuestionBlock]:
    blocks: List[QuestionBlock] = []
    current: Optional[QuestionBlock] = None
    recent_context: List[str] = []
    current_section: Optional[str] = None
    section_index = 0
    last_question_number: Optional[int] = None
    global_question_number = 0
    occurrence_counts: Dict[int, int] = {}

    for line in lines:
        if line.index in answer_key_line_indexes:
            if current:
                blocks.append(current)
                current = None
            recent_context.clear()
            continue

        boundary = _parse_question_boundary(line.text)
        if boundary:
            if current:
                blocks.append(current)

            candidate_section = _latest_section_title(recent_context)
            if candidate_section and (current_section is None or boundary.number == 1):
                current_section = candidate_section
            elif last_question_number is not None and boundary.number <= last_question_number:
                section_index += 1
                current_section = candidate_section or f"Section {section_index + 1}"

            global_question_number += 1
            occurrence_counts[boundary.number] = occurrence_counts.get(boundary.number, 0) + 1
            current = QuestionBlock(
                question_number=boundary.number,
                global_question_number=global_question_number,
                section_title=current_section,
                source_page_start=line.page_number,
                source_page_end=line.page_number,
                declared_type=boundary.declared_type,
                occurrence_index=occurrence_counts[boundary.number],
            )
            if boundary.rest:
                current.lines.append(SourceLine(boundary.rest, line.page_number, line.index))

            recent_context.clear()
            last_question_number = boundary.number
            continue

        if current:
            current.lines.append(line)
            current.source_page_end = max(current.source_page_end, line.page_number)
        elif line.text:
            recent_context.append(line.text)
            recent_context = recent_context[-8:]

    if current:
        blocks.append(current)

    return blocks


def _parse_question_boundary(text: str) -> Optional[QuestionBoundary]:
    stripped = text.strip()
    if not stripped:
        return None

    type_before = TYPE_BEFORE_NUM_RE.match(stripped)
    if type_before:
        return QuestionBoundary(
            number=int(type_before.group("num")),
            declared_type=_normalize_question_type_label(type_before.group("type")),
            rest=type_before.group("rest").strip(),
        )

    q_prefix = Q_PREFIX_RE.match(stripped)
    if q_prefix:
        rest = q_prefix.group("rest").strip()
        return QuestionBoundary(
            number=int(q_prefix.group("num")),
            declared_type=_extract_question_type(rest),
            rest=rest,
        )

    numbered = NUMBERED_RE.match(stripped)
    if numbered:
        number = int(numbered.group("num"))
        if number > 500:
            return None
        rest = numbered.group("rest").strip()
        return QuestionBoundary(number=number, declared_type=_extract_question_type(rest), rest=rest)

    return None


def _parse_question_block(
    block: QuestionBlock,
    answer_keys: AnswerKeys,
    mark_rules: List[MarkRule],
    question_number_counts: Dict[int, int],
    source_filename: Optional[str],
) -> Dict[str, Any]:
    cleaned_lines: List[SourceLine] = []
    inline_answer = ""

    for source_line in block.lines:
        text = source_line.text.strip()
        if not text:
            continue
        answer, remainder = _extract_inline_answer(text)
        if answer:
            inline_answer = answer
            text = remainder.strip()
        text = _strip_question_metadata(text)
        if text:
            cleaned_lines.append(SourceLine(text, source_line.page_number, source_line.index))

    question_lines, options = _parse_options_and_question_text(cleaned_lines)
    question_text = _clean_spaces(" ".join(question_lines))
    raw_text = _clean_spaces(" ".join(line.text for line in cleaned_lines))
    type_found = bool(block.declared_type or _extract_question_type(raw_text))
    question_type = block.declared_type or _extract_question_type(raw_text)
    if not question_type:
        question_type = _infer_question_type(question_text, options, inline_answer)

    marks, negative_marks, marks_found = _resolve_marks(raw_text, question_type, block.question_number, mark_rules)
    answer = inline_answer or _lookup_answer(answer_keys, block, question_number_counts)
    answer = _normalize_answer(answer, question_type)

    section_title = block.section_title
    has_image = bool(IMAGE_CONTEXT_RE.search(question_text))
    return {
        "question_type": question_type,
        "question_text": question_text,
        "options": options,
        "correct_answer": answer,
        "marks": marks,
        "negative_marks": negative_marks,
        "subject": None,
        "topic": section_title,
        "section_title": section_title,
        "question_number": block.question_number,
        "global_question_number": block.global_question_number,
        "source_filename": source_filename,
        "source_page_start": block.source_page_start,
        "source_page_end": block.source_page_end,
        "has_image": has_image,
        "_type_found": type_found,
        "_marks_found": marks_found,
        "_answer_source": "inline" if inline_answer else "answer_key" if answer else None,
    }


def _extract_inline_answer(text: str) -> tuple[str, str]:
    match = ANSWER_LINE_RE.search(text)
    if not match:
        return "", text
    answer = _clean_answer_value(match.group("answer"))
    remainder = text[: match.start()].strip()
    return answer, remainder


def _clean_answer_value(value: str) -> str:
    text = str(value or "").strip()
    text = re.split(r"\s+(?:because|since|for)\b", text, maxsplit=1, flags=re.IGNORECASE)[0]
    text = text.strip().strip("[]()")
    if re.fullmatch(r"[A-Da-d](?:\s*[,;/]\s*[A-Da-d])*[.)]?", text):
        text = text.rstrip(".)")
    return text.strip()


def _strip_question_metadata(text: str) -> str:
    if not text:
        return text
    match = QUESTION_HEADER_RE.match(text)
    if match and (match.group("type") or match.group("marks") or match.group("bracket_marks")):
        return match.group("rest").strip()
    text = re.sub(rf"^\s*\[?\s*{TYPE_TOKEN_RE}\s*\]?\s*(?:\|\s*)?", "", text, flags=re.IGNORECASE)
    text = MARKS_INLINE_RE.sub("", text, count=1).strip()
    text = MARKS_WORD_RE.sub("", text, count=1).strip()
    return text.strip(" |")


def _parse_options_and_question_text(lines: List[SourceLine]) -> tuple[List[str], List[str]]:
    question_lines: List[str] = []
    options_by_label: Dict[str, str] = {}
    current_label: Optional[str] = None

    for line in lines:
        text = line.text.strip()
        markers = list(OPTION_MARKER_RE.finditer(text))
        if markers:
            prefix = text[: markers[0].start()].strip()
            if prefix:
                if current_label:
                    options_by_label[current_label] = _clean_spaces(f"{options_by_label.get(current_label, '')} {prefix}")
                else:
                    question_lines.append(prefix)

            for idx, marker in enumerate(markers):
                label = (marker.group(1) or marker.group(2)).upper()
                next_start = markers[idx + 1].start() if idx + 1 < len(markers) else len(text)
                value = text[marker.end() : next_start].strip()
                if label in options_by_label and value:
                    options_by_label[label] = _clean_spaces(f"{options_by_label[label]} {value}")
                else:
                    options_by_label.setdefault(label, value)
                current_label = label
            continue

        if current_label:
            options_by_label[current_label] = _clean_spaces(f"{options_by_label.get(current_label, '')} {text}")
        elif text:
            question_lines.append(text)

    options = [_clean_spaces(options_by_label[label]) for label in ("A", "B", "C", "D") if options_by_label.get(label, "").strip()]
    return question_lines, options


def _resolve_marks(
    raw_text: str,
    question_type: str,
    question_number: int,
    mark_rules: List[MarkRule],
) -> tuple[float, float, bool]:
    inline = MARKS_INLINE_RE.search(raw_text)
    if inline:
        return float(inline.group("marks")), float(inline.group("negative")), True

    word = MARKS_WORD_RE.search(raw_text)
    if word:
        return float(word.group("marks")), DEFAULT_NEGATIVE.get(question_type, 0.33), True

    for rule in mark_rules:
        if rule.start <= question_number <= rule.end:
            return rule.marks, DEFAULT_NEGATIVE.get(question_type, 0.33), True

    return DEFAULT_MARKS.get(question_type, 1.0), DEFAULT_NEGATIVE.get(question_type, 0.33), False


def _lookup_answer(keys: AnswerKeys, block: QuestionBlock, question_number_counts: Dict[int, int]) -> str:
    if block.section_title:
        section_answers = keys.by_section.get((block.section_title, block.question_number))
        if section_answers:
            return section_answers[min(block.occurrence_index - 1, len(section_answers) - 1)]

    answers = keys.by_number.get(block.question_number, [])
    if not answers:
        return ""
    if question_number_counts.get(block.question_number, 0) == 1 and len(answers) == 1:
        return answers[0]
    if len(answers) >= block.occurrence_index:
        return answers[block.occurrence_index - 1]
    return ""


def _validate_and_score(question: Dict[str, Any], duplicate: bool = False) -> Dict[str, Any]:
    warnings: List[str] = []
    q_type = question["question_type"]
    answer = question.get("correct_answer") or ""
    options = question.get("options") or []

    if not question.get("question_text"):
        warnings.append("missing_question_text")

    if q_type in {"mcq", "msq"}:
        if not options:
            warnings.append("missing_options")
        elif len(options) < 4:
            warnings.append("too_few_options")
        elif len(options) > 4:
            warnings.append("too_many_options")

    if not answer:
        warnings.append("missing_answer")
    elif q_type == "nat" and not is_valid_nat_answer(answer):
        warnings.append("nat_has_non_numeric_answer")
    elif q_type == "mcq":
        tokens = _choice_tokens(answer)
        if len(tokens) > 1:
            warnings.append("mcq_has_multiple_answers")
        elif not tokens or tokens[0] not in {"A", "B", "C", "D"}:
            warnings.append("invalid_choice_answer")
    elif q_type == "msq":
        tokens = _choice_tokens(answer)
        if not tokens or any(token not in {"A", "B", "C", "D"} for token in tokens):
            warnings.append("invalid_choice_answer")
        elif len(tokens) == 1:
            warnings.append("msq_has_single_answer_but_allowed")

    if question.get("has_image"):
        warnings.append("image_context_required")
    if duplicate:
        warnings.append("duplicate_question_number_in_same_section")
    if question.get("_answer_source") is None and answer:
        warnings.append("ambiguous_answer_key")

    confidence = _confidence_score(question, warnings)
    if confidence < 0.7 and "low_confidence" not in warnings:
        warnings.append("low_confidence")
        confidence = _confidence_score(question, warnings)

    question["warnings"] = warnings
    question["confidence"] = confidence
    question["needs_review"] = any(warning in REVIEW_WARNINGS for warning in warnings) or confidence < 0.7
    question.pop("_type_found", None)
    question.pop("_marks_found", None)
    question.pop("_answer_source", None)
    return question


def _confidence_score(question: Dict[str, Any], warnings: List[str]) -> float:
    score = 0.0
    q_type = question["question_type"]
    options = question.get("options") or []
    answer = question.get("correct_answer") or ""

    if question.get("question_text"):
        score += 0.2
    if question.get("_type_found"):
        score += 0.15
    elif q_type:
        score += 0.08

    if q_type == "nat":
        score += 0.15 if not options else 0.05
    elif len(options) == 4:
        score += 0.2
    elif 2 <= len(options) < 4:
        score += 0.1

    if answer:
        score += 0.25
    if question.get("_marks_found"):
        score += 0.1
    else:
        score += 0.05

    severe = {
        "missing_answer",
        "missing_options",
        "too_few_options",
        "too_many_options",
        "nat_has_non_numeric_answer",
        "mcq_has_multiple_answers",
        "invalid_choice_answer",
        "missing_question_text",
    }
    score -= 0.1 * sum(1 for warning in warnings if warning in severe)
    if "image_context_required" in warnings:
        score -= 0.05
    return round(max(0.0, min(1.0, score)), 2)


def _infer_question_type(question_text: str, options: List[str], answer: str) -> str:
    text_type = _extract_question_type(question_text)
    if text_type:
        return text_type
    if options:
        return "msq" if len(_choice_tokens(answer)) > 1 else "mcq"
    if is_valid_nat_answer(answer) or re.search(r"\b(value|number|calculate|find|____|___)\b", question_text, re.IGNORECASE):
        return "nat"
    return "mcq"


def _extract_question_type(text: str) -> Optional[str]:
    for pattern, q_type in TYPE_ALIASES:
        if pattern.search(text or ""):
            return q_type
    return None


def _normalize_question_type_label(value: str) -> Optional[str]:
    return _extract_question_type(value)


def _normalize_answer(answer: str, question_type: str) -> str:
    if not answer:
        return ""
    if question_type in {"mcq", "msq"}:
        return normalize_choice_answer(answer)
    return ",".join(token.replace(" ", "") for token in split_answer_tokens(answer))


def _choice_tokens(answer: str) -> List[str]:
    return [token.upper() for token in split_answer_tokens(answer)]


def _latest_section_title(lines: List[str]) -> Optional[str]:
    for text in reversed(lines):
        if _looks_section_title(text):
            return _clean_spaces(text)
    return None


def _looks_section_title(text: str) -> bool:
    value = _clean_spaces(text)
    if not value or len(value) > 120:
        return False
    if _parse_question_boundary(value) or OPTION_MARKER_RE.match(value) or ANSWER_LINE_RE.search(value):
        return False
    lower = value.lower()
    if re.search(r"\b(section|chapter|topic|subject|part|test|quiz|dpp|module)\b", lower):
        return True
    words = re.findall(r"[A-Za-z]+", value)
    return 1 <= len(words) <= 10 and value.upper() == value and any(len(word) > 2 for word in words)


def _clean_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def validate_json_questions(data: list) -> List[Dict[str, Any]]:
    normalized = []
    for q in data:
        q_type = str(q.get("question_type", "mcq")).lower()
        if q_type not in ("mcq", "msq", "nat"):
            q_type = "mcq"

        correct_answer = str(q.get("correct_answer", "")).strip()
        if q_type in {"mcq", "msq"}:
            correct_answer = normalize_choice_answer(correct_answer)

        normalized.append({
            "question_type": q_type,
            "question_text": str(q.get("question_text", "")).strip(),
            "options": q.get("options", []),
            "correct_answer": correct_answer,
            "marks": float(q.get("marks", DEFAULT_MARKS[q_type])),
            "negative_marks": float(q.get("negative_marks", DEFAULT_NEGATIVE[q_type])),
            "subject": q.get("subject"),
            "topic": q.get("topic"),
        })

    return [q for q in normalized if q["question_text"]]
