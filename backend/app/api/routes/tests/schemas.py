from typing import List, Optional

from pydantic import BaseModel, Field


class AnswerSubmit(BaseModel):
    question_id: int
    selected_answer: Optional[str] = None
    time_spent_seconds: int = Field(default=0, ge=0)


class BulkAnswerSubmit(BaseModel):
    answers: List[AnswerSubmit]


class ViolationUpdate(BaseModel):
    tab_violations: Optional[int] = Field(default=None, ge=0)
    fullscreen_violations: Optional[int] = Field(default=None, ge=0)
