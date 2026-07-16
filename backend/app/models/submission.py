from datetime import datetime
from sqlalchemy import Column, String, Text, Float, Boolean, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class Submission(Base):
    __tablename__ = "submissions"

    id              = Column(Uuid, primary_key=True, default=uuid.uuid4)
    assignment_id   = Column(Uuid, ForeignKey("assignments.id"), nullable=False)
    student_id      = Column(Uuid, ForeignKey("users.id"), nullable=False)

    content         = Column(Text, nullable=True)          # text answer
    file_url        = Column(String(500), nullable=True)   # uploaded file URL
    file_name       = Column(String(200), nullable=True)

    score           = Column(Float, nullable=True)         # set by mentor
    feedback        = Column(Text, nullable=True)          # mentor feedback
    is_graded       = Column(Boolean, default=False)
    is_late         = Column(Boolean, default=False)
    late_days       = Column(Float, default=0.0)

    submitted_at    = Column(DateTime, default=datetime.utcnow)
    graded_at       = Column(DateTime, nullable=True)

    assignment = relationship("Assignment", back_populates="submissions")
    student    = relationship("User", backref="submissions")

    def __repr__(self):
        return f"<Submission student={self.student_id} graded={self.is_graded}>"