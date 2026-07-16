from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id            = Column(Uuid, primary_key=True, default=uuid.uuid4)
    course_id     = Column(Uuid, ForeignKey("courses.id"), nullable=False)
    mentor_id     = Column(Uuid, ForeignKey("users.id"), nullable=False)

    title         = Column(String(200), nullable=False)
    description   = Column(Text, nullable=True)
    instructions  = Column(Text, nullable=True)
    max_score     = Column(Float, default=100.0)
    passing_score = Column(Float, default=50.0)
    deadline      = Column(DateTime, nullable=True)
    late_penalty  = Column(Float, default=10.0)   # % deducted per day late
    allow_late    = Column(Boolean, default=True)
    is_active     = Column(Boolean, default=True)

    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    course      = relationship("Course", back_populates="assignments")
    mentor      = relationship("User", foreign_keys=[mentor_id], backref="assignments_created")
    submissions = relationship("Submission", back_populates="assignment",
                               cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Assignment {self.title}>"