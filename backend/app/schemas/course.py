import enum
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Union, Any
from datetime import datetime
from uuid import UUID


class CourseStatus(str, enum.Enum):
    draft    = "draft"
    pending  = "pending"
    approved = "approved"
    rejected = "rejected"


class CourseLevel(str, enum.Enum):
    beginner     = "beginner"
    intermediate = "intermediate"
    advanced     = "advanced"


class CourseCreate(BaseModel):
    title:       str           = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    thumbnail:   Optional[str] = None
    level:       CourseLevel   = CourseLevel.beginner
    tags:        Optional[Union[str, List[str]]] = None
    is_gated:    bool          = False

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return [t.strip() for t in v.split(",") if t.strip()] or None
        if isinstance(v, list):
            return [str(t).strip() for t in v if str(t).strip()] or None
        return v


class CourseUpdate(BaseModel):
    title:       Optional[str]                = None
    description: Optional[str]                = None
    thumbnail:   Optional[str]                = None
    level:       Optional[CourseLevel]        = None
    tags:        Optional[Union[str, List[str]]] = None
    is_gated:    Optional[bool]               = None

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return [t.strip() for t in v.split(",") if t.strip()] or None
        if isinstance(v, list):
            return [str(t).strip() for t in v if str(t).strip()] or None
        return v


class CourseStatusUpdate(BaseModel):
    status: CourseStatus
    reason: Optional[str] = None


class CourseReviewUpdate(BaseModel):
    """Schema for admin to approve/reject a course"""
    status:   CourseStatus = Field(..., description="approved or rejected")
    notes:    Optional[str] = Field(None, description="Admin's review notes")


class MentorInfo(BaseModel):
    id:   UUID
    name: str
    model_config = {"from_attributes": True}


class CourseResponse(BaseModel):
    id:             UUID
    mentor_id:      UUID
    title:          str
    description:    Optional[str]
    thumbnail:      Optional[str]
    level:          CourseLevel
    tags:           Optional[Any]
    status:         CourseStatus
    is_gated:       bool
    total_lessons:  int
    total_enrolled: int
    created_at:     datetime
    mentor:         Optional[MentorInfo] = None
    reviewed_by:    Optional[UUID] = None
    reviewed_at:    Optional[datetime] = None
    review_notes:   Optional[str] = None
    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def normalize_tags(self):
        if isinstance(self.tags, list):
            self.tags = ", ".join(str(t) for t in self.tags) or None
        return self


class CourseListResponse(BaseModel):
    courses: List[CourseResponse]
    total:   int
