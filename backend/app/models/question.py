from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class Question(Base):
    __tablename__ = "questions"

    id             = Column(Uuid, primary_key=True, default=uuid.uuid4)
    quiz_id        = Column(Uuid, ForeignKey("quizzes.id"), nullable=False)

    text           = Column(Text, nullable=False)
    option_a       = Column(String(500), nullable=False)
    option_b       = Column(String(500), nullable=False)
    option_c       = Column(String(500), nullable=True)
    option_d       = Column(String(500), nullable=True)
    correct_option = Column(String(1), nullable=False)   # "a", "b", "c", or "d"
    explanation    = Column(Text, nullable=True)          # shown after attempt
    points         = Column(Integer, default=1)
    order          = Column(Integer, default=0)

    created_at     = Column(DateTime, default=datetime.utcnow)

    quiz           = relationship("Quiz", back_populates="questions")

    def __repr__(self):
        return f"<Question {self.text[:40]}>"