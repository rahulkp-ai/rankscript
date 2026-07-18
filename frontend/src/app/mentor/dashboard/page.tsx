"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import StatCard from "@/components/analytics/StatCard";
import ScoreChart from "@/components/analytics/ScoreChart";
import ProgressRing from "@/components/analytics/ProgressRing";
import CourseCard from "@/components/course/CourseCard";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { getMyCourses, deleteCourse, getCourseEnrollmentCount, Course } from "@/services/courseService";
import { getMentorAnalytics, MentorAnalytics } from "@/services/analyticsService";

export default function MentorDashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [courses,   setCourses]   = useState<Course[]>([]);
  const [analytics, setAnalytics] = useState<MentorAnalytics | null>(null);
  const [fetching,  setFetching]  = useState(true);

  // Delete course state
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string>("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>("");

  useEffect(() => {
    if (!loading && user?.role !== "mentor" && user?.role !== "admin") router.push("/dashboard");
  }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, a] = await Promise.all([getMyCourses(), getMentorAnalytics()]);
        setCourses(c);
        setAnalytics(a);
      } catch (err) { console.error(err); }
      finally { setFetching(false); }
    };
    if (user) load();
  }, [user]);

  const handleDeleteRequest = async (course: Course) => {
    setCourseToDelete(course);
    setDeleteError("");
    // Fetch enrollment count to show warning
    try {
      const result = await getCourseEnrollmentCount(course.id);
      if (result.enrollment_count > 0) {
        setDeleteWarning(
          `This course has ${result.enrollment_count} enrolled student${result.enrollment_count !== 1 ? "s" : ""}. Their enrollment data will be permanently lost.`
        );
      } else {
        setDeleteWarning("");
      }
    } catch {
      setDeleteWarning("");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteCourse(courseToDelete.id);
      // Remove course from state in real time
      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
      // Update analytics if available
      if (analytics) {
        setAnalytics({
          ...analytics,
          total_courses: analytics.total_courses - 1,
          courses: analytics.courses.filter((c) => c.course_id !== courseToDelete.id),
        });
      }
      setCourseToDelete(null);
      setDeleteWarning("");
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to delete course. Please try again.";
      setDeleteError(typeof message === "string" ? message : "Failed to delete course.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Mentor Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage your courses and students</p>
          </div>
          <Link href="/mentor/courses/create"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors">
            + New Course
          </Link>
        </div>

        {/* Stats */}
        {analytics && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total courses"    value={analytics.total_courses}       color="indigo" icon="📚"/>
              <StatCard label="Total students"   value={analytics.total_students}      color="blue"   icon="🎓"/>
              <StatCard label="Total lessons"    value={analytics.total_lessons}       color="green"  icon="🎬"/>
              <StatCard label="Pending grades"   value={analytics.pending_submissions} color="amber"  icon="⏳"/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

              {/* Performance chart */}
              <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-6">Platform Performance</h2>
                <ScoreChart data={[
                  { label: "Avg completion rate", value: analytics.avg_completion_rate, color: "#6366f1" },
                  { label: "Avg quiz score",       value: analytics.avg_quiz_score,      color: "#22c55e" },
                ]}/>

                {/* Course breakdown */}
                {analytics.courses.length > 0 && (
                  <div className="mt-6">
                    <p className="text-gray-400 text-sm font-medium mb-3">Per course completion</p>
                    <ScoreChart data={analytics.courses.map((c) => ({
                      label: c.course_title,
                      value: c.completion_rate,
                      color: "#f59e0b",
                    }))}/>
                  </div>
                )}
              </div>

              {/* Progress rings */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-6">Overview</h2>
                <div className="flex flex-col gap-6 items-center">
                  <ProgressRing value={analytics.avg_completion_rate} label="Avg completion" color="#6366f1"/>
                  <ProgressRing value={analytics.avg_quiz_score}      label="Avg quiz score" color="#22c55e"/>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-purple-400 font-bold text-xl">{analytics.total_quizzes}</p>
                    <p className="text-gray-500 text-xs">Quizzes</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-amber-400 font-bold text-xl">{analytics.total_assignments}</p>
                    <p className="text-gray-500 text-xs">Assignments</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-course table */}
            {analytics.courses.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-white font-semibold">Course Analytics</h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {analytics.courses.map((c) => (
                    <div key={c.course_id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="text-white text-sm font-medium truncate">{c.course_title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {c.total_lessons} lessons · {c.total_quizzes} quizzes · {c.total_assignments} assignments
                        </p>
                      </div>
                      <div className="flex items-center gap-6 text-sm flex-shrink-0">
                        <div className="text-center">
                          <p className="text-indigo-400 font-bold">{c.total_enrolled}</p>
                          <p className="text-gray-500 text-xs">enrolled</p>
                        </div>
                        <div className="text-center">
                          <p className="text-green-400 font-bold">{c.completion_rate}%</p>
                          <p className="text-gray-500 text-xs">completed</p>
                        </div>
                        <div className="text-center">
                          <p className={`font-bold ${c.pending_submissions > 0 ? "text-amber-400" : "text-gray-500"}`}>
                            {c.pending_submissions}
                          </p>
                          <p className="text-gray-500 text-xs">pending</p>
                        </div>
                        <Link href={`/mentor/courses/${c.course_id}/submissions`}
                          className="text-xs text-indigo-400 hover:text-indigo-300">
                          Grade →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Course cards */}
        {fetching ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse h-48"/>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-gray-400 mb-4">No courses yet</p>
            <Link href="/mentor/courses/create" className="text-indigo-400 text-sm">Create your first course →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} isMentor={true} onDelete={handleDeleteRequest}/>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!courseToDelete}
        title="Delete course"
        message={`Are you sure you want to delete "${courseToDelete?.title}"? This action cannot be undone and will remove all lessons, quizzes, and assignments in this course.`}
        warning={deleteWarning}
        error={deleteError}
        confirmLabel="Delete course"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setCourseToDelete(null); setDeleteWarning(""); setDeleteError(""); }}
      />
    </div>
  );
}