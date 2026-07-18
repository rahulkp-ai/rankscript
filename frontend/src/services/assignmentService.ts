import api from "@/lib/axiosInstance";

export interface Assignment {
  id:            string;
  course_id:     string;
  mentor_id:     string;
  title:         string;
  description:   string | null;
  instructions:  string | null;
  max_score:     number;
  passing_score: number;
  deadline:      string | null;
  late_penalty:  number;
  allow_late:    boolean;
  is_active:     boolean;
  created_at:    string;
}

export interface Submission {
  id:            string;
  assignment_id: string;
  student_id:    string;
  content:       string | null;
  file_url:      string | null;
  file_name:     string | null;
  score:         number | null;
  feedback:      string | null;
  is_graded:     boolean;
  is_late:       boolean;
  late_days:     number;
  submitted_at:  string;
  graded_at:     string | null;
}

export async function getAssignments(courseId: string): Promise<Assignment[]> {
  const res = await api.get(`/courses/${courseId}/assignments`);
  return res.data;
}

export async function createAssignment(
  courseId: string,
  data: Partial<Assignment>
): Promise<Assignment> {
  const res = await api.post(`/courses/${courseId}/assignments`, data);
  return res.data;
}

export async function submitAssignment(
  courseId: string,
  assignmentId: string,
  content: string,
  fileUrl?: string,
  fileName?: string
): Promise<Submission> {
  const res = await api.post(
    `/courses/${courseId}/assignments/${assignmentId}/submit`,
    { content, file_url: fileUrl, file_name: fileName }
  );
  return res.data;
}

export async function getMySubmission(
  courseId: string, assignmentId: string
): Promise<Submission | null> {
  try {
    const res = await api.get(
      `/courses/${courseId}/assignments/${assignmentId}/submission/me`
    );
    return res.data;
  } catch {
    return null;
  }
}

export async function getAllSubmissions(
  courseId: string, assignmentId: string
): Promise<Submission[]> {
  const res = await api.get(
    `/courses/${courseId}/assignments/${assignmentId}/submissions`
  );
  return res.data;
}

export async function gradeSubmission(
  courseId: string, assignmentId: string,
  submissionId: string, score: number, feedback: string
): Promise<Submission> {
  const res = await api.put(
    `/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}/grade`,
    { score, feedback }
  );
  return res.data;
}
