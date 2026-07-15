from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class AdminUserEntry(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    country: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    xp: float = 0.0
    rank_score: float = 0.0
    streak_days: int = 0
    is_active: bool = True
    is_verified: bool = False
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    model_config = {"from_attributes": True}


class AdminLeaderboardResponse(BaseModel):
    entries: List[AdminUserEntry]
    total: int
    page: int
    per_page: int
    total_pages: int


class GeographicStats(BaseModel):
    total_users: int
    average_score: float
    top_performer: Optional[str] = None
    top_score: float = 0.0


class StateDistrictOption(BaseModel):
    name: str
    count: int


class GeographicFilters(BaseModel):
    states: List[StateDistrictOption]
    districts: List[StateDistrictOption]


class UserDetailResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    country: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    xp: float = 0.0
    rank_score: float = 0.0
    streak_days: int = 0
    is_active: bool = True
    is_verified: bool = False
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    # Student-specific
    enrollments: Optional[List[dict]] = None
    quiz_attempts_count: int = 0
    submissions_count: int = 0
    assigned_mentor: Optional[dict] = None
    # Mentor-specific
    courses_count: int = 0
    assigned_students: Optional[List[dict]] = None
    model_config = {"from_attributes": True}


class RemoveStudentRequest(BaseModel):
    confirmation_name: str = Field(..., min_length=1, description="Student's name for confirmation")
    admin_password: str = Field(..., min_length=1, description="Admin password for verification")


class RemoveMentorRequest(BaseModel):
    confirmation_name: str = Field(..., min_length=1, description="Mentor's name for confirmation")
    admin_password: str = Field(..., min_length=1, description="Admin password for verification")
    reassign_to: Optional[UUID] = Field(None, description="Mentor ID to reassign students to, or None to leave unassigned")


class AuditLogEntry(BaseModel):
    id: UUID
    admin_id: UUID
    action: str
    target_user_id: Optional[UUID] = None
    target_name: Optional[str] = None
    target_email: Optional[str] = None
    target_role: Optional[str] = None
    details: Optional[str] = None
    reference_id: str
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class AuditLogResponse(BaseModel):
    entries: List[AuditLogEntry]
    total: int


class MentorOption(BaseModel):
    id: UUID
    name: str
    email: str
    model_config = {"from_attributes": True}


class RemoveResponse(BaseModel):
    success: bool
    message: str
    reference_id: str
