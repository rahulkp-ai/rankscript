import api from "@/lib/axiosInstance";

export interface Course {
  id:             string;
  mentor_id:      string;
  title:          string;
  description:    string | null;
  thumbnail:      string | null;
  level:          "beginner" | "intermediate" | "advanced";
  tags:           string | null;
  status:         "draft" | "pending" | "approved" | "rejected";
  is_gated:       boolean;
  total_lessons:  number;
  total_enrolled: number;
  created_at:     string;
  mentor?:        { id: string; name: string };
}

export interface Lesson {
  id:             string;
  course_id:      string;
  title:          string;
  description:    string | null;
  youtube_url:    string;
  youtube_id:     string | null;
  duration:       number;
  order:          number;
  module:         string | null;
  is_free:        boolean;
  review_status:  "pending" | "approved" | "rejected";
  review_feedback?: string | null;
  created_at:     string;
}

export interface CreateCourseData {
  title:       string;
  description?: string;
  level:       string;
  tags?:       string;
  is_gated:    boolean;
}

export interface CreateLessonData {
  title:       string;
  description?: string;
  youtube_url: string;
  duration?:   number;
  order?:      number;
  module?:     string;
  is_free?:    boolean;
}

// Public — get all approved courses
export async function getCourses(): Promise<{ courses: Course[]; total: number }> {
  const res = await api.get("/courses");
  return res.data;
}

// Get single course
export async function getCourse(id: string): Promise<Course> {
  const res = await api.get(`/courses/${id}`);
  return res.data;
}

// Mentor — create course
export async function createCourse(data: CreateCourseData): Promise<Course> {
  const res = await api.post("/courses", data);
  return res.data;
}

// Mentor — get my courses
export async function getMyCourses(): Promise<Course[]> {
  const res = await api.get("/courses/my");
  return res.data;
}

// Admin — get pending courses
export async function getPendingCourses(): Promise<Course[]> {
  const res = await api.get("/courses/pending");
  return res.data;
}

// Admin — approve or reject course
export async function updateCourseStatus(
  id: string, status: string
): Promise<Course> {
  const res = await api.put(`/courses/${id}/approve`, { status });
  return res.data;
}

// Mentor — add lesson to course
export async function addLesson(
  courseId: string, data: CreateLessonData
): Promise<Lesson> {
  const res = await api.post(`/courses/${courseId}/lessons`, data);
  return res.data;
}

// Get lessons for a course
export async function getLessons(courseId: string): Promise<Lesson[]> {
  const res = await api.get(`/courses/${courseId}/lessons`);
  return res.data;
}

export interface PendingLesson {
  id:             string;
  course_id:      string;
  course_title:   string;
  title:          string;
  description:    string | null;
  youtube_url:    string;
  review_status:  string;
  created_at:     string;
}

// Admin — get all pending lessons
export async function getPendingLessons(): Promise<PendingLesson[]> {
  const res = await api.get("/courses/pending-lessons");
  return res.data;
}

// Admin — review (approve/reject) a lesson
export async function reviewLesson(
  lessonId: string, status: string, feedback?: string
): Promise<Lesson> {
  const res = await api.put(
    `/courses/lessons/${lessonId}/review`,
    { status, feedback }
  );
  return res.data;
}

// Mentor — delete a course
export interface DeleteCourseResult {
  deleted: boolean;
  course_id: string;
  enrollments_removed: number;
  lessons_removed: number;
  quizzes_removed: number;
  assignments_removed: number;
}

export async function deleteCourse(courseId: string): Promise<DeleteCourseResult> {
  const res = await api.delete(`/courses/${courseId}`);
  return res.data;
}

// Mentor — get enrollment count for a course (for deletion warnings)
export async function getCourseEnrollmentCount(courseId: string): Promise<{ course_id: string; enrollment_count: number }> {
  const res = await api.get(`/courses/${courseId}/enrollment-count`);
  return res.data;
}

// Mentor — delete a lesson
export interface DeleteLessonResult {
  deleted: boolean;
  lesson_id: string;
  course_id: string;
  enrollment_count: number;
}

export async function deleteLesson(courseId: string, lessonId: string): Promise<DeleteLessonResult> {
  const res = await api.delete(`/courses/${courseId}/lessons/${lessonId}`);
  return res.data;
}

// Mentor — get enrollment count for a lesson's parent course
export async function getLessonEnrollmentCount(courseId: string, lessonId: string): Promise<{ lesson_id: string; enrollment_count: number }> {
  const res = await api.get(`/courses/${courseId}/lessons/${lessonId}/enrollment-count`);
  return res.data;
}
