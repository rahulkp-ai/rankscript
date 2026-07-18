"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { getCourse, getLessons, addLesson, deleteCourse, deleteLesson, getLessonEnrollmentCount, Course, Lesson } from "@/services/courseService";
import { getQuizzes, Quiz } from "@/services/quizService";
import { getAssignments, Assignment } from "@/services/assignmentService";

export default function ManageCoursePage() {
  const params   = useParams();
  const router   = useRouter();
  const courseId = params.id as string;

  const [course,      setCourse]      = useState<Course | null>(null);
  const [lessons,     setLessons]     = useState<Lesson[]>([]);
  const [quizzes,     setQuizzes]     = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showAdd,     setShowAdd]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [activeTab,   setActiveTab]   = useState<"lessons"|"quizzes"|"assignments">("lessons");
  const [lessonForm,  setLessonForm]  = useState({
    title: "", description: "", youtube_url: "", module: "", is_free: false,
  });

  // Delete course state
  const [showDeleteCourse, setShowDeleteCourse] = useState(false);
  const [courseDeleteWarning, setCourseDeleteWarning] = useState("");
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Delete lesson state
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [lessonDeleteWarning, setLessonDeleteWarning] = useState("");
  const [deletingLesson, setDeletingLesson] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, l, q, a] = await Promise.all([
          getCourse(courseId),
          getLessons(courseId),
          getQuizzes(courseId),
          getAssignments(courseId),
        ]);
        setCourse(c);
        setLessons(l);
        setQuizzes(q);
        setAssignments(a);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const lesson = await addLesson(courseId, {
        title:       lessonForm.title,
        description: lessonForm.description || undefined,
        youtube_url: lessonForm.youtube_url,
        module:      lessonForm.module || undefined,
        order:       lessons.length,
        is_free:     lessonForm.is_free,
      });
      setLessons([...lessons, lesson]);
      setLessonForm({ title:"", description:"", youtube_url:"", module:"", is_free:false });
      setShowAdd(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to add lesson");
    } finally {
      setSaving(false);
    }
  };

  // Delete course handlers
  const handleDeleteCourseRequest = async () => {
    setShowDeleteCourse(true);
    setDeleteError("");
    if (course && course.total_enrolled > 0) {
      setCourseDeleteWarning(
        `This course has ${course.total_enrolled} enrolled student${course.total_enrolled !== 1 ? "s" : ""}. Their enrollment data will be permanently lost.`
      );
    } else {
      setCourseDeleteWarning("");
    }
  };

  const handleDeleteCourseConfirm = async () => {
    setDeletingCourse(true);
    setDeleteError("");
    try {
      await deleteCourse(courseId);
      setShowDeleteCourse(false);
      router.push("/mentor/dashboard");
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to delete course. Please try again.";
      setDeleteError(typeof message === "string" ? message : "Failed to delete course.");
    } finally {
      setDeletingCourse(false);
    }
  };

  // Delete lesson handlers
  const handleDeleteLessonRequest = async (lesson: Lesson) => {
    setLessonToDelete(lesson);
    try {
      const result = await getLessonEnrollmentCount(courseId, lesson.id);
      if (result.enrollment_count > 0) {
        setLessonDeleteWarning(
          `This lesson's course has ${result.enrollment_count} enrolled student${result.enrollment_count !== 1 ? "s" : ""}. Deleting this lesson may affect their progress.`
        );
      } else {
        setLessonDeleteWarning("");
      }
    } catch {
      setLessonDeleteWarning("");
    }
  };

  const handleDeleteLessonConfirm = async () => {
    if (!lessonToDelete) return;
    setDeletingLesson(true);
    try {
      await deleteLesson(courseId, lessonToDelete.id);
      // Remove lesson from state and update course lesson count
      setLessons((prev) => prev.filter((l) => l.id !== lessonToDelete.id));
      if (course) {
        setCourse({ ...course, total_lessons: Math.max(0, course.total_lessons - 1) });
      }
      setLessonToDelete(null);
      setLessonDeleteWarning("");
    } catch (err: any) {
      console.error(err);
    } finally {
      setDeletingLesson(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-400 animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    approved: "bg-green-900/50 text-green-400",
    pending:  "bg-yellow-900/50 text-yellow-400",
    draft:    "bg-gray-800 text-gray-400",
    rejected: "bg-red-900/50 text-red-400",
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{course?.title}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColors[course?.status || "draft"]}`}>
                {course?.status}
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              {lessons.length} lessons · {quizzes.length} quizzes · {assignments.length} assignments · {course?.total_enrolled} students
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeleteCourseRequest}
              className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete course
            </button>
            <Link href={`/mentor/courses/${courseId}/submissions`}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              View submissions →
            </Link>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6">
          {(["lessons","quizzes","assignments"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
              }`}>
              {tab} ({tab === "lessons" ? lessons.length : tab === "quizzes" ? quizzes.length : assignments.length})
            </button>
          ))}
        </div>

        {activeTab === "lessons" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-white font-semibold">Lessons</h2>
              <Button onClick={() => setShowAdd(!showAdd)} variant="secondary">
                {showAdd ? "Cancel" : "+ Add Lesson"}
              </Button>
            </div>
            {lessons.length === 0 && !showAdd ? (
              <div className="p-10 text-center">
                <p className="text-gray-500 text-sm">No lessons yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {lessons.map((lesson, idx) => (
                  <div key={lesson.id} className="flex items-center gap-4 px-6 py-4 group">
                    <span className="text-gray-600 text-sm w-6">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{lesson.title}</p>
                      {lesson.module && <p className="text-gray-500 text-xs">{lesson.module}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={lesson.youtube_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300">View →</a>
                      <button
                        onClick={() => handleDeleteLessonRequest(lesson)}
                        className="ml-2 w-7 h-7 flex items-center justify-center rounded-md text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete lesson"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showAdd && (
              <form onSubmit={handleAddLesson} className="border-t border-gray-800 p-6 flex flex-col gap-4">
                <Input label="Lesson title" value={lessonForm.title} required
                  onChange={(e) => setLessonForm({...lessonForm, title: e.target.value})}
                  placeholder="e.g. Introduction to Variables"/>
                <Input label="YouTube URL" value={lessonForm.youtube_url} required
                  onChange={(e) => setLessonForm({...lessonForm, youtube_url: e.target.value})}
                  placeholder="https://www.youtube.com/watch?v=..."/>
                <Input label="Module (optional)" value={lessonForm.module}
                  onChange={(e) => setLessonForm({...lessonForm, module: e.target.value})}
                  placeholder="e.g. Chapter 1"/>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={lessonForm.is_free}
                    onChange={(e) => setLessonForm({...lessonForm, is_free: e.target.checked})}
                    className="w-4 h-4 accent-indigo-600"/>
                  <span className="text-sm text-gray-300">Free preview</span>
                </label>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button type="submit" loading={saving}>Add Lesson</Button>
              </form>
            )}
          </div>
        )}

        {activeTab === "quizzes" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-white font-semibold">Quizzes</h2>
              <Link href={`/mentor/courses/${courseId}/quiz/create`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                + Create Quiz
              </Link>
            </div>
            {quizzes.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-4xl mb-3">❓</p>
                <p className="text-gray-500 text-sm mb-4">No quizzes yet</p>
                <Link href={`/mentor/courses/${courseId}/quiz/create`}
                  className="text-indigo-400 hover:text-indigo-300 text-sm">
                  Create your first quiz →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-white text-sm font-medium">{quiz.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {quiz.question_count} questions ·
                        {quiz.time_limit > 0 ? ` ${quiz.time_limit}min ·` : " No limit ·"}
                        Pass: {quiz.pass_score}%
                      </p>
                    </div>
                    <span className="text-xs text-indigo-400">{quiz.max_attempts} attempts max</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-white font-semibold">Assignments</h2>
              <Link href={`/mentor/courses/${courseId}/assignment/create`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                + Create Assignment
              </Link>
            </div>
            {assignments.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-4xl mb-3">📝</p>
                <p className="text-gray-500 text-sm mb-4">No assignments yet</p>
                <Link href={`/mentor/courses/${courseId}/assignment/create`}
                  className="text-indigo-400 hover:text-indigo-300 text-sm">
                  Create your first assignment →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-white text-sm font-medium">{a.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Max: {a.max_score} · Pass: {a.passing_score}
                        {a.deadline && ` · Due: ${new Date(a.deadline).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      a.allow_late ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-400"
                    }`}>
                      {a.allow_late ? "Late OK" : "No late"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete course confirmation dialog */}
      <ConfirmDialog
        open={showDeleteCourse}
        title="Delete course"
        message={`Are you sure you want to delete "${course?.title}"? This action cannot be undone and will remove all lessons, quizzes, and assignments in this course.`}
        warning={courseDeleteWarning}
        error={deleteError}
        confirmLabel="Delete course"
        variant="danger"
        loading={deletingCourse}
        onConfirm={handleDeleteCourseConfirm}
        onCancel={() => { setShowDeleteCourse(false); setCourseDeleteWarning(""); setDeleteError(""); }}
      />

      {/* Delete lesson confirmation dialog */}
      <ConfirmDialog
        open={!!lessonToDelete}
        title="Delete lesson"
        message={`Are you sure you want to delete "${lessonToDelete?.title}"? This action cannot be undone.`}
        warning={lessonDeleteWarning}
        confirmLabel="Delete lesson"
        variant="danger"
        loading={deletingLesson}
        onConfirm={handleDeleteLessonConfirm}
        onCancel={() => { setLessonToDelete(null); setLessonDeleteWarning(""); }}
      />
    </div>
  );
}
