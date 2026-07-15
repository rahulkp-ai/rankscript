from datetime import datetime
from sqlalchemy import (
    Column, DateTime, ForeignKey,
    Float, Integer, Boolean, UniqueConstraint, Uuid
)
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class Enrollment(Base):
    __tablename__ = "enrollments"

    id          = Column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id  = Column(Uuid, ForeignKey("users.id"), nullable=False)
    course_id   = Column(Uuid, ForeignKey("courses.id"), nullable=False)

    # Progress
    progress        = Column(Float, default=0.0)       # 0.0 – 100.0 percent
    lessons_done    = Column(Integer, default=0)
    last_lesson_id  = Column(Uuid, ForeignKey("lessons.id"), nullable=True)

    # Status
    is_approved     = Column(Boolean, default=False)    # False if gated course
    is_completed    = Column(Boolean, default=False)
    completed_at    = Column(DateTime, nullable=True)

    # Timestamps
    enrolled_at     = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student         = relationship("User", backref="enrollments")
    course          = relationship("Course", back_populates="enrollments")

    __table_args__ = (
        UniqueConstraint('student_id', 'course_id', name='uq_enrollment_student_course'),
    )

    def __repr__(self):
        return f"<Enrollment student={self.student_id} course={self.course_id}>"