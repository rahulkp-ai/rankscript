from pydantic import BaseModel
from typing import List, Optional


class StudentAnalytics(BaseModel):
    total_enrolled:       int
    total_completed:      int
    avg_quiz_score:       float
    total_assignments:    int
    submitted_assignments: int
    graded_assignments:   int
    avg_assignment_score: float
    total_quiz_attempts:  int
    passed_quizzes:       int
    current_streak:       int
    rank_score:           float
    indian_rank:          Optional[int]
    state_rank:           Optional[int]


class CourseStats(BaseModel):
    course_id:        str
    course_title:     str
    total_enrolled:   int
    total_completed:  int
    completion_rate:  float
    avg_quiz_score:   float
    total_lessons:    int
    total_quizzes:    int
    total_assignments: int
    pending_submissions: int


class MentorAnalytics(BaseModel):
    total_courses:       int
    total_students:      int
    total_lessons:       int
    total_quizzes:       int
    total_assignments:   int
    pending_submissions: int
    avg_completion_rate: float
    avg_quiz_score:      float
    courses:             List[CourseStats]


class TopStudent(BaseModel):
    user_id:    str
    name:       str
    rank_score: float
    xp:         float
    state:      Optional[str]
    district:   Optional[str]


class AdminAnalytics(BaseModel):
    total_users:        int
    total_students:     int
    total_mentors:      int
    total_admins:       int
    total_courses:      int
    approved_courses:   int
    pending_courses:    int
    total_enrollments:  int
    total_quiz_attempts: int
    total_submissions:  int
    platform_completion_rate: float
    top_students:       List[TopStudent]