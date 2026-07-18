"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Button from "@/components/common/Button";
import {
  getPendingCourses, updateCourseStatus, Course,
  getPendingLessons, reviewLesson, PendingLesson,
} from "@/services/courseService";
import { useAuth } from "@/hooks/useAuth";

export default function AdminApprovalsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [courses,  setCourses]  = useState<Course[]>([]);
  const [lessons,  setLessons]  = useState<PendingLesson[]>([]);
  const [fetching, setFetching] = useState(true);
  const [acting,   setActing]   = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"courses" | "lessons">("courses");

  useEffect(() => {
    if (!loading && user?.role !== "admin") router.push("/dashboard");
  }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const [pendingCourses, pendingLessons] = await Promise.all([
          getPendingCourses(),
          getPendingLessons(),
        ]);
        setCourses(pendingCourses);
        setLessons(pendingLessons);
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, []);

  const handleCourse = async (courseId: string, status: "approved" | "rejected") => {
    setActing(courseId);
    try {
      await updateCourseStatus(courseId, status);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (err) {
      console.error(err);
    } finally {
      setActing(null);
    }
  };

  const handleLesson = async (lessonId: string, status: "approved" | "rejected") => {
    setActing(lessonId);
    try {
      await reviewLesson(lessonId, status);
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    } catch (err) {
      console.error(err);
    } finally {
      setActing(null);
    }
  };

  const totalPending = courses.length + lessons.length;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Approvals</h1>
          <p className="text-gray-400 mt-1">
            {totalPending} item{totalPending !== 1 ? "s" : ""} pending review
          </p>
        </div>

        {fetching ? (
          <div className="text-center py-20 text-gray-400 animate-pulse">Loading...</div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6">
              {(["courses", "lessons"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    activeTab === tab ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                  }`}>
                  {tab} ({tab === "courses" ? courses.length : lessons.length})
                </button>
              ))}
            </div>

            {/* Courses tab */}
            {activeTab === "courses" && (
              courses.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="text-gray-400">No pending courses</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {courses.map((course) => (
                    <div key={course.id}
                      className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-lg">{course.title}</h3>
                          {course.description && (
                            <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                              {course.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            <span className="capitalize">{course.level}</span>
                            <span>{course.total_lessons} lessons</span>
                            {course.tags && <span>{course.tags}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            onClick={() => handleCourse(course.id, "approved")}
                            loading={acting === course.id}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleCourse(course.id, "rejected")}
                            loading={acting === course.id}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Lessons tab */}
            {activeTab === "lessons" && (
              lessons.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="text-gray-400">No pending lessons</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {lessons.map((lesson) => (
                    <div key={lesson.id}
                      className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-indigo-400 text-xs font-medium mb-1">
                            {lesson.course_title}
                          </p>
                          <h3 className="text-white font-semibold text-lg">{lesson.title}</h3>
                          {lesson.description && (
                            <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                              {lesson.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            <a href={lesson.youtube_url} target="_blank" rel="noopener noreferrer"
                              className="text-indigo-400 hover:underline">
                              View video
                            </a>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            onClick={() => handleLesson(lesson.id, "approved")}
                            loading={acting === lesson.id}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleLesson(lesson.id, "rejected")}
                            loading={acting === lesson.id}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
