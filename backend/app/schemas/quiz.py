from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class QuizCreate(BaseModel):
    title:        str           = Field(..., min_length=3, max_length=200)
    description:  Optional[str] = None
    time_limit:   int           = Field(default=0, ge=0)    # 0 = no limit
    pass_score:   float         = Field(default=50.0, ge=0, le=100)
    max_attempts: int           = Field(default=3, ge=0)
    randomize:    bool          = False


class QuizResponse(BaseModel):
    id:           UUID
    course_id:    UUID
    mentor_id:    UUID
    title:        str
    description:  Optional[str]
    time_limit:   int
    pass_score:   float
    max_attempts: int
    is_active:    bool
    randomize:    bool
    created_at:   datetime
    question_count: Optional[int] = 0
    model_config = {"from_attributes": True}


class QuizListResponse(BaseModel):
    quizzes: List[QuizResponse]
    total:   int