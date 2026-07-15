import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Boolean, Index, Enum, Uuid
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class LessonReviewStatus(str, enum.Enum):
    pending  = "pending"
    approved = "approved"
    rejected = "rejected"


class Lesson(Base):
    __tablename__ = "lessons"

    id          = Column(Uuid, primary_key=True, default=uuid.uuid4)
    course_id   = Column(Uuid, ForeignKey("courses.id"), nullable=False)

    title       = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    youtube_url = Column(String(500), nullable=False)   # full YouTube URL
    youtube_id  = Column(String(50),  nullable=True)    # extracted video ID
    duration    = Column(Integer, default=0)             # seconds
    order       = Column(Integer, default=0)             # position in course
    module      = Column(String(100), nullable=True)     # optional module/chapter name
    is_free     = Column(Boolean, default=False)         # preview without enrollment
    
    # Admin review fields
    review_status    = Column(Enum(LessonReviewStatus), default=LessonReviewStatus.pending, nullable=False)
    reviewed_by      = Column(Uuid, ForeignKey("users.id"), nullable=True)
    reviewed_at      = Column(DateTime, nullable=True)
    review_feedback  = Column(Text, nullable=True)       # Admin's feedback on video alignment

    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    course      = relationship("Course", back_populates="lessons")
    reviewer    = relationship("User", foreign_keys=[reviewed_by])

    __table_args__ = (
        Index('ix_lesson_course_id', 'course_id'),
        Index('ix_lesson_review_status', 'review_status'),
    )

    def __repr__(self):
        return f"<Lesson {self.title} (order={self.order})>"