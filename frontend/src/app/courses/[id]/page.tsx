"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import VideoPlayer from "@/components/course/VideoPlayer";
import ProgressBar from "@/components/course/ProgressBar";
import Button from "@/components/common/Button";
import { getCourse, getLessons, Course, Lesson } from "@/services/courseService";
import { enrollInCourse, getMyEnrollments, updateProgress, Enrollment } from "@/services/enrollmentService";
import { getQuizzes, getMyAttempts, Quiz } from "@/services/quizService";
import { getAssignments, getMySubmission, Assignment } from "@/services/assignmentService";
import { useAuth } from "@/hooks/useAuth";

export default function CourseDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const { user, isAuthenticated } = useAuth();
  const courseId = params.id as string;

  const [course,       setCourse]       = useState<Course | null>(null);
  const [lessons,      setLessons]      = useState<Lesson[]>([]);
  const [quizzes,      setQuizzes]      = useState<Quiz[]>([]);
  const [assignments,  setAssignments]  = useState<Assignment[]>([]);
  const [enrollment,   setEnrollment]   = useState<Enrollment | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeTab,    setActiveTab]    = useState<"lessons"|"quizzes"|"assignments">("lessons");
  const [loading,      setLoading]      = useState(true);
  const [enrolling,    setEnrolling]    = useState(false);
  const [error,        setError]        = useState("");
  const [quizScores,   setQuizScores]   = useState<Record<string, number>>({});
  const [submitted,    setSubmitted]    = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const c = await getCourse(courseId);
        setCourse(c);

        if (isAuthenticated) {
          const enrs = await getMyEnrollments();
          const myEnr = enrs.find((e) => e.course_id === courseId);
          if (myEnr) {
            setEnrollment(myEnr);
            const [l, q, a] = await Promise.all([
              getLessons(courseId),
              getQuizzes(courseId),
              getAssignments(courseId),
            ]);
            setLessons(l);
            setQuizzes(q);
            setAssignments(a);
            if (l.length > 0) setActiveLesson(l[0]);

            // Fetch quiz scores and submissions in parallel to avoid N+1 waterfall
            const [quizResults, subResults] = await Promise.all([
              Promise.all(q.map((quiz) =>
                getMyAttempts(courseId, quiz.id).then((attempts) => ({ quizId: quiz.id, attempts }))
              )),
              Promise.all(a.map((assignment) =>
                getMySubmission(courseId, assignment.id).then((sub) => ({ assignmentId: assignment.id, sub }))
              )),
            ]);

            const scores: Record<string, number> = {};
            for (const { quizId, attempts } of quizResults) {
              if (attempts.length > 0) {
                scores[quizId] = Math.max(...attempts.map((att) => att.score));
              }
            }
            setQuizScores(scores);

            const subs: Record<string, boolean> = {};
            for (const { assignmentId, sub } of subResults) {
              subs[assignmentId] = !!sub;
            }
            setSubmitted(subs);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId, isAuthenticated]);

  const handleEnroll = async () => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    setEnrolling(true);
    setError("");
    try {
      const enr = await enrollInCourse(courseId);
      setEnrollment(enr);
      const [l, q, a] = await Promise.all([
        getLessons(courseId),
        getQuizzes(courseId),
        getAssignments(courseId),
      ]);
      setLessons(l);
      setQuizzes(q);
      setAssignments(a);
      if (l.length > 0) setActiveLesson(l[0]);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  };

  // Handle video progress updates
  const handleVideoProgress = async (percent: number) => {
    if (!enrollment || !activeLesson) return;
    
    try {
      // Calculate lessons done based on progress (for single video, 100% = 1 lesson)
      const totalLessons = lessons.length || 1;
      const lessonsDone = Math.ceil((percent / 100) * totalLessons);
      
      // Update progress via API
      const updated = await updateProgress(
        enrollment.id,
        activeLesson.id,
        percent,
        Math.min(lessonsDone, totalLessons)
      );
      setEnrollment(updated);
    } catch (err) {
      console.error("Failed to update progress:", err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950"><Navbar />
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400 animate-pulse">Loading course...</p>
      </div>
    </div>
  );

  if (!course) return (
    <div className="min-h-screen bg-gray-950"><Navbar />
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Course not found</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950"><Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left — main content */}
          <div className="lg:col-span-2">
            {activeLesson?.youtube_id ? (
              activeLesson.review_status === "approved" ? (
                <VideoPlayer 
                  youtubeId={activeLesson.youtube_id} 
                  title={activeLesson.title}
                  onProgress={handleVideoProgress}
                />
              ) : (
                <div className="w-full h-64 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-amber-400 text-2xl mb-2">⏳</p>
                    <p className="text-gray-400">
                      {activeLesson.review_status === "rejected" 
                        ? "This lesson has been rejected by admin" 
                        : "This lesson is pending admin review"}
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="w-full h-64 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center">
                <p className="text-gray-500">
                  {enrollment ? "Select a lesson to watch" : "Enroll to access content"}
                </p>
              </div>
            )}

            {activeLesson && (
              <div className="mt-4 mb-6">
                <h2 className="text-white font-semibold text-lg">{activeLesson.title}</h2>
                {activeLesson.description && (
                  <p className="text-gray-400 text-sm mt-1">{activeLesson.description}</p>
                )}
              </div>
            )}

            {/* Tabs — only show when enrolled */}
            {enrollment && (
              <>
                <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-4">
                  {(["lessons","quizzes","assignments"] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        activeTab === tab ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                      }`}>
                      {tab} ({tab === "lessons" ? lessons.length : tab === "quizzes" ? quizzes.length : assignments.length})
                    </button>
                  ))}
                </div>

                {/* Lessons list */}
                {activeTab === "lessons" && lessons.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {lessons.map((lesson, idx) => (
                      <button key={lesson.id} onClick={() => setActiveLesson(lesson)}
                        className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-colors ${
                          activeLesson?.id === lesson.id
                            ? "bg-indigo-900/30 border-indigo-700"
                            : "bg-gray-900 border-gray-800 hover:border-gray-700"
                        }`}>
                        <span className="text-gray-500 text-sm w-6">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{lesson.title}</p>
                          {lesson.module && <p className="text-gray-500 text-xs">{lesson.module}</p>}
                        </div>
                        {lesson.duration > 0 && (
                          <span className="text-gray-500 text-xs">{Math.floor(lesson.duration/60)}m</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quizzes list */}
                {activeTab === "quizzes" && (
                  <div className="flex flex-col gap-3">
                    {quizzes.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-8">No quizzes yet</p>
                    ) : quizzes.map((quiz) => {
                      const score = quizScores[quiz.id];
                      const taken = score !== undefined;
                      return (
                        <div key={quiz.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium text-sm">{quiz.title}</p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {quiz.question_count} questions ·
                              {quiz.time_limit > 0 ? ` ${quiz.time_limit}min ·` : ""} Pass: {quiz.pass_score}%
                            </p>
                            {taken && (
                              <p className={`text-xs mt-1 ${score >= quiz.pass_score ? "text-green-400" : "text-red-400"}`}>
                                Best score: {Math.round(score)}%
                              </p>
                            )}
                          </div>
                          <Link href={`/courses/${courseId}/quiz/${quiz.id}`}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors">
                            {taken ? "Retake" : "Start Quiz"}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Assignments list */}
                {activeTab === "assignments" && (
                  <div className="flex flex-col gap-3">
                    {assignments.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-8">No assignments yet</p>
                    ) : assignments.map((a) => {
                      const isSubmitted = submitted[a.id];
                      const isPast = a.deadline ? new Date() > new Date(a.deadline) : false;
                      return (
                        <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium text-sm">{a.title}</p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              Max: {a.max_score} pts ·
                              {a.deadline ? ` Due: ${new Date(a.deadline).toLocaleDateString()}` : " No deadline"}
                            </p>
                            {isPast && !isSubmitted && (
                              <p className="text-red-400 text-xs mt-1">
                                {a.allow_late ? "Late submission allowed" : "Deadline passed"}
                              </p>
                            )}
                          </div>
                          {isSubmitted ? (
                            <span className="text-xs bg-green-900/50 text-green-400 px-3 py-1 rounded-full">✓ Submitted</span>
                          ) : (
                            <Link href={`/courses/${courseId}/assignment/${a.id}`}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors">
                              Submit
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sticky top-20">
              <h1 className="text-white font-bold text-xl mb-2">{course.title}</h1>
              {course.description && (
                <p className="text-gray-400 text-sm mb-4">{course.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-indigo-400 font-bold text-lg">{course.total_lessons}</p>
                  <p className="text-gray-500 text-xs">Lessons</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-indigo-400 font-bold text-lg">{course.total_enrolled}</p>
                  <p className="text-gray-500 text-xs">Enrolled</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-purple-400 font-bold text-lg">{quizzes.length}</p>
                  <p className="text-gray-500 text-xs">Quizzes</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-amber-400 font-bold text-lg">{assignments.length}</p>
                  <p className="text-gray-500 text-xs">Assignments</p>
                </div>
              </div>

              {enrollment && (
                <div className="mb-4">
                  <ProgressBar progress={enrollment.progress}/>
                </div>
              )}

              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

              {!enrollment ? (
                <Button fullWidth loading={enrolling} onClick={handleEnroll}>
                  {isAuthenticated ? "Enroll Now" : "Login to Enroll"}
                </Button>
              ) : (
                <div className="text-center py-2">
                  <span className="text-green-400 text-sm font-medium">✓ You are enrolled</span>
                </div>
              )}

              {course.tags && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(Array.isArray(course.tags) ? course.tags : course.tags.split(",")).map((tag: string) => (
                    <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">
                      {typeof tag === 'string' ? tag.trim() : tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
