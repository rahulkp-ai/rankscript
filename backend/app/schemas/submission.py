from pydantic import BaseModel, field_validator, model_validator
from typing import Optional
from datetime import datetime
from uuid import UUID


class SubmissionCreate(BaseModel):
    content:   Optional[str] = None    # text answer
    file_url:  Optional[str] = None    # uploaded file URL
    file_name: Optional[str] = None

    @field_validator("content", mode="before")
    @classmethod
    def strip_content(cls, v: Optional[str]) -> Optional[str]:
        """Strip whitespace so an all-spaces submission is treated as empty."""
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v

    @model_validator(mode="after")
    def check_at_least_one(self) -> "SubmissionCreate":
        # content is already stripped by the field validator above
        if not self.content and not self.file_url:
            raise ValueError(
                "A submission must include either text content or a file URL. "
                "Please write your answer before submitting."
            )
        return self


class SubmissionGrade(BaseModel):
    score:    float
    feedback: Optional[str] = None


class SubmissionResponse(BaseModel):
    id:            UUID
    assignment_id: UUID
    student_id:    UUID
    content:       Optional[str]
    file_url:      Optional[str]
    file_name:     Optional[str]
    score:         Optional[float]
    feedback:      Optional[str]
    is_graded:     bool
    is_late:       bool
    late_days:     float
    submitted_at:  datetime
    graded_at:     Optional[datetime]

    model_config = {"from_attributes": True}
