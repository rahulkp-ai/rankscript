import api from "@/lib/axiosInstance";

export interface StudentAnalytics {
  total_enrolled:        number;
  total_completed:       number;
  avg_quiz_score:        number;
  total_assignments:     number;
  submitted_assignments: number;
  graded_assignments:    number;
  avg_assignment_score:  number;
  total_quiz_attempts:   number;
  passed_quizzes:        number;
  current_streak:        number;
  rank_score:            number;
  indian_rank:           number | null;
  state_rank:            number | null;
}

export interface CourseStats {
  course_id:           string;
  course_title:        string;
  total_enrolled:      number;
  total_completed:     number;
  completion_rate:     number;
  avg_quiz_score:      number;
  total_lessons:       number;
  total_quizzes:       number;
  total_assignments:   number;
  pending_submissions: number;
}

export interface MentorAnalytics {
  total_courses:       number;
  total_students:      number;
  total_lessons:       number;
  total_quizzes:       number;
  total_assignments:   number;
  pending_submissions: number;
  avg_completion_rate: number;
  avg_quiz_score:      number;
  courses:             CourseStats[];
}

export interface TopStudent {
  user_id:    string;
  name:       string;
  rank_score: number;
  xp:         number;
  state:      string | null;
  district:   string | null;
}

export interface AdminAnalytics {
  total_users:              number;
  total_students:           number;
  total_mentors:            number;
  total_admins:             number;
  total_courses:            number;
  approved_courses:         number;
  pending_courses:          number;
  total_enrollments:        number;
  total_quiz_attempts:      number;
  total_submissions:        number;
  platform_completion_rate: number;
  top_students:             TopStudent[];
}

export async function getStudentAnalytics(): Promise<StudentAnalytics> {
  const res = await api.get("/analytics/student/me");
  return res.data;
}

export async function getMentorAnalytics(): Promise<MentorAnalytics> {
  const res = await api.get("/analytics/mentor/overview");
  return res.data;
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const res = await api.get("/analytics/admin/overview");
  return res.data;
}
