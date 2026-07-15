from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class EnrollRequest(BaseModel):
    course_id: UUID


class ProgressUpdate(BaseModel):
    lesson_id:    str
    progress:     float       # 0.0 – 100.0
    lessons_done: int


class EnrollmentResponse(BaseModel):
    id:            UUID
    student_id:    UUID
    course_id:     UUID
    progress:      float
    lessons_done:  int
    is_approved:   bool
    is_completed:  bool
    enrolled_at:   datetime
    model_config = {"from_attributes": True}