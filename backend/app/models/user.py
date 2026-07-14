import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float,
    Boolean, DateTime, Enum, Text, Uuid
)
from sqlalchemy import func
import uuid
from app.db.base import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    mentor = "mentor"
    student = "student"


class User(Base):
    __tablename__ = "users"

    id            = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name          = Column(String(100), nullable=False)
    email         = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(Enum(UserRole), default=UserRole.student, nullable=False)

    # Location for ranking system
    country       = Column(String(100), default="India")
    state         = Column(String(100), nullable=True)
    district      = Column(String(100), nullable=True)

    # Ranking & XP
    xp            = Column(Float, default=0.0)
    rank_score    = Column(Float, default=0.0)
    streak_days   = Column(Integer, default=0)

    # Status
    is_active     = Column(Boolean, default=True)
    is_verified   = Column(Boolean, default=False)
    bio           = Column(Text, nullable=True)
    avatar_url    = Column(String(500), nullable=True)

    # Timestamps
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login    = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"