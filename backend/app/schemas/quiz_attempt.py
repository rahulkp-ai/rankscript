from pydantic import BaseModel
from typing import Any, Dict, Optional
from datetime import datetime
from uuid import UUID


class QuizSubmit(BaseModel):
    answers:    Dict[str, str]   # {question_id: "a"/"b"/"c"/"d"}
    time_taken: int = 0          # seconds taken


class AttemptResult(BaseModel):
    id:            UUID
    quiz_id:       UUID
    student_id:    UUID
    score:         float
    total_points:  int
    earned_points: int
    passed:        bool
    time_taken:    int
    submitted_at:  Optional[datetime]
    answers:       Optional[Dict[str, Any]] = None
    model_config = {"from_attributes": True}


class AttemptWithDetails(AttemptResult):
    """Includes per-question breakdown."""
    breakdown: Optional[list] = None