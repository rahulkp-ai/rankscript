import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime,
    Enum, ForeignKey, Boolean, Integer,
    Index, Uuid, JSON
)
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class CourseStatus(str, enum.Enum):
    draft    = "draft"
    pending  = "pending"
    approved = "approved"
    rejected = "rejected"


class CourseLevel(str, enum.Enum):
    beginner     = "beginner"
    intermediate = "intermediate"
    advanced     = "advanced"


class Course(Base):
    __tablename__ = "courses"

    id          = Column(Uuid, primary_key=True, default=uuid.uuid4)
    mentor_id   = Column(Uuid, ForeignKey("users.id"), nullable=False)

    title       = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    thumbnail   = Column(String(500), nullable=True)
    level       = Column(Enum(CourseLevel), default=CourseLevel.beginner)
    tags        = Column(JSON, default=list)            # JSON array for structured search

    status      = Column(Enum(CourseStatus), default=CourseStatus.draft, nullable=False)
    is_gated    = Column(Boolean, default=False)       # mentor must approve students

    # Stats (denormalized for speed)
    total_lessons   = Column(Integer, default=0)
    total_enrolled  = Column(Integer, default=0)

    # Timestamps
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Admin review fields
    reviewed_by    = Column(Uuid, ForeignKey("users.id"), nullable=True)
    reviewed_at    = Column(DateTime, nullable=True)
    review_notes   = Column(Text, nullable=True)           # Admin's overall review notes

    # Relationships
    mentor      = relationship("User", backref="courses", foreign_keys=[mentor_id])
    lessons     = relationship("Lesson", back_populates="course",
                               cascade="all, delete-orphan", order_by="Lesson.order")
    enrollments = relationship("Enrollment", back_populates="course",
                               cascade="all, delete-orphan")
    quizzes     = relationship("Quiz", back_populates="course",
                               cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="course",
                               cascade="all, delete-orphan")
    reviewer    = relationship("User", foreign_keys=[reviewed_by])

    __table_args__ = (
        Index('ix_course_status', 'status'),
        Index('ix_course_mentor_id', 'mentor_id'),
    )

    def __repr__(self):
        return f"<Course {self.title} [{self.status}]>"