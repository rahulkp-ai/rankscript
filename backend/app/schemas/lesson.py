from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
import re


def extract_youtube_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from various URL formats."""
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",
        r"(?:embed\/)([0-9A-Za-z_-]{11})",
        r"(?:youtu\.be\/)([0-9A-Za-z_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


class LessonCreate(BaseModel):
    title:       str          = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    youtube_url: str          = Field(..., description="Full YouTube video URL")
    duration:    int          = Field(default=0, ge=0)
    order:       int          = Field(default=0, ge=0)
    module:      Optional[str] = None
    is_free:     bool         = False


class LessonUpdate(BaseModel):
    title:       Optional[str] = None
    description: Optional[str] = None
    youtube_url: Optional[str] = None
    duration:    Optional[int] = None
    order:       Optional[int] = None
    module:      Optional[str] = None
    is_free:     Optional[bool] = None


class LessonResponse(BaseModel):
    id:             UUID
    course_id:      UUID
    title:          str
    description:    Optional[str]
    youtube_url:    str
    youtube_id:     Optional[str]
    duration:       int
    order:          int
    module:         Optional[str]
    is_free:        bool
    review_status:  str = "pending"          # pending, approved, rejected
    reviewed_by:    Optional[UUID] = None
    reviewed_at:    Optional[datetime] = None
    review_feedback: Optional[str] = None
    created_at:     datetime
    model_config = {"from_attributes": True}


class LessonReviewUpdate(BaseModel):
    """Schema for admin to review a lesson"""
    status:   str = Field(..., description="approved or rejected")
    feedback: Optional[str] = Field(None, description="Admin's feedback on video alignment")