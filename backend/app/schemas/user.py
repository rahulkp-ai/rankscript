import enum
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class UserRole(str, enum.Enum):
    admin   = "admin"
    mentor  = "mentor"
    student = "student"


class UserRegister(BaseModel):
    name:     str       = Field(..., min_length=2, max_length=100)
    email:    EmailStr
    password: str       = Field(..., min_length=6)
    role:     UserRole  = UserRole.student
    state:    Optional[str] = None
    district: Optional[str] = None


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class Token(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id:          UUID
    name:        str
    email:       str
    role:        UserRole
    country:     Optional[str]
    state:       Optional[str]
    district:    Optional[str]
    xp:          float
    rank_score:  float
    is_active:   bool
    is_verified: bool
    avatar_url:  Optional[str] = None
    created_at:  Optional[datetime] = None
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name:     Optional[str] = None
    state:    Optional[str] = None
    district: Optional[str] = None
    bio:      Optional[str] = None
