from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from uuid import UUID


class QuestionCreate(BaseModel):
    text:           str = Field(..., min_length=5)
    option_a:       str = Field(..., min_length=1)
    option_b:       str = Field(..., min_length=1)
    option_c:       Optional[str] = None
    option_d:       Optional[str] = None
    correct_option: str = Field(..., pattern="^[abcd]$")
    explanation:    Optional[str] = None
    points:         int = Field(default=1, ge=1)
    order:          int = Field(default=0, ge=0)


class QuestionResponse(BaseModel):
    id:             UUID
    quiz_id:        UUID
    text:           str
    option_a:       str
    option_b:       str
    option_c:       Optional[str]
    option_d:       Optional[str]
    points:         int
    order:          int
    created_at:     datetime
    model_config = {"from_attributes": True}


class QuestionWithAnswer(QuestionResponse):
    """Includes correct answer — only for mentor view."""
    correct_option: str
    explanation:    Optional[str]