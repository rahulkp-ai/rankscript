import api from "@/lib/axiosInstance";

export interface Quiz {
  id:             string;
  course_id:      string;
  mentor_id:      string;
  title:          string;
  description:    string | null;
  time_limit:     number;
  pass_score:     number;
  max_attempts:   number;
  is_active:      boolean;
  randomize:      boolean;
  created_at:     string;
  question_count: number;
}

export interface Question {
  id:       string;
  quiz_id:  string;
  text:     string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  points:   number;
  order:    number;
}

export interface AttemptResult {
  id:            string;
  quiz_id:       string;
  score:         number;
  total_points:  number;
  earned_points: number;
  passed:        boolean;
  time_taken:    number;
  submitted_at:  string;
}

export interface CreateQuizData {
  title:        string;
  description?: string;
  time_limit:   number;
  pass_score:   number;
  max_attempts: number;
  randomize:    boolean;
}

export interface CreateQuestionData {
  text:           string;
  option_a:       string;
  option_b:       string;
  option_c?:      string;
  option_d?:      string;
  correct_option: string;
  explanation?:   string;
  points:         number;
  order:          number;
}

export async function getQuizzes(courseId: string): Promise<Quiz[]> {
  const res = await api.get(`/courses/${courseId}/quizzes`);
  return res.data;
}

export async function createQuiz(courseId: string, data: CreateQuizData): Promise<Quiz> {
  const res = await api.post(`/courses/${courseId}/quizzes`, data);
  return res.data;
}

export async function getQuestions(courseId: string, quizId: string): Promise<Question[]> {
  const res = await api.get(`/courses/${courseId}/quizzes/${quizId}/questions`);
  return res.data;
}

export async function addQuestion(
  courseId: string,
  quizId: string,
  data: CreateQuestionData
): Promise<Question> {
  const res = await api.post(
    `/courses/${courseId}/quizzes/${quizId}/questions`,
    data
  );
  return res.data;
}

export async function submitQuiz(
  courseId: string,
  quizId: string,
  answers: Record<string, string>,
  timeTaken: number
): Promise<AttemptResult> {
  const res = await api.post(
    `/courses/${courseId}/quizzes/${quizId}/attempt`,
    { answers, time_taken: timeTaken }
  );
  return res.data;
}

export async function getMyAttempts(
  courseId: string,
  quizId: string
): Promise<AttemptResult[]> {
  const res = await api.get(
    `/courses/${courseId}/quizzes/${quizId}/attempts/me`
  );
  return res.data;
}