import api from "@/lib/axiosInstance";

export interface Enrollment {
  id:           string;
  student_id:   string;
  course_id:    string;
  progress:     number;
  lessons_done: number;
  is_approved:  boolean;
  is_completed: boolean;
  enrolled_at:  string;
}

export async function enrollInCourse(courseId: string): Promise<Enrollment> {
  const res = await api.post("/enrollments", { course_id: courseId });
  return res.data;
}

export async function getMyEnrollments(): Promise<Enrollment[]> {
  const res = await api.get("/enrollments/me");
  return res.data;
}

export async function updateProgress(
  enrollmentId: string,
  lessonId: string,
  progress: number,
  lessonsDone: number
): Promise<Enrollment> {
  const res = await api.put(
    `/enrollments/${enrollmentId}/progress`,
    { lesson_id: lessonId, progress, lessons_done: lessonsDone }
  );
  return res.data;
}
