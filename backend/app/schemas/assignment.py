from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class AssignmentCreate(BaseModel):
    title:         str           = Field(..., min_length=3, max_length=200)
    description:   Optional[str] = None
    instructions:  Optional[str] = None
    max_score:     float         = Field(default=100.0, gt=0)
    passing_score: float         = Field(default=50.0, ge=0)
    deadline:      Optional[datetime] = None
    late_penalty:  float         = Field(default=10.0, ge=0)
    allow_late:    bool          = True


class AssignmentResponse(BaseModel):
    id:            UUID
    course_id:     UUID
    mentor_id:     UUID
    title:         str
    description:   Optional[str]
    instructions:  Optional[str]
    max_score:     float
    passing_score: float
    deadline:      Optional[datetime]
    late_penalty:  float
    allow_late:    bool
    is_active:     bool
    created_at:    datetime
    model_config = {"from_attributes": True}