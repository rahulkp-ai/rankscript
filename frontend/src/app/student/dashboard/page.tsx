"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import ProgressBar from "@/components/course/ProgressBar";
import StatCard from "@/components/analytics/StatCard";
import ScoreChart from "@/components/analytics/ScoreChart";
import ProgressRing from "@/components/analytics/ProgressRing";
import ActivityCalendar from "@/components/analytics/ActivityCalendar";
import { useAuth } from "@/hooks/useAuth";
import { getMyEnrollments, Enrollment } from "@/services/enrollmentService";
import { getCourse, Course } from "@/services/courseService";
import { getMyRank, recalculateMyRank, MyRankResponse } from "@/services/rankingService";
import { getStudentAnalytics, StudentAnalytics } from "@/services/analyticsService";

export default function StudentDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [enrollments,   setEnrollments]   = useState<Enrollment[]>([]);
  const [courses,       setCourses]       = useState<Record<string, Course>>({});
  const [myRank,        setMyRank]        = useState<MyRankResponse | null>(null);
  const [analytics,     setAnalytics]     = useState<StudentAnalytics | null>(null);
  const [fetching,      setFetching]      = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
    if (!loading && user?.role !== "student") router.push("/dashboard");
  }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const [enrs, rank, stats] = await Promise.all([
          getMyEnrollments(),
          getMyRank(),
          getStudentAnalytics(),
        ]);
        setEnrollments(enrs);
        setMyRank(rank);
        setAnalytics(stats);
        const courseMap: Record<string, Course> = {};
        await Promise.all(enrs.map(async (e) => {
          const c = await getCourse(e.course_id);
          courseMap[e.course_id] = c;
        }));
        setCourses(courseMap);
      } catch (err) { console.error(err); }
      finally { setFetching(false); }
    };
    if (user) load();
  }, [user]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await recalculateMyRank();
      const [rank, stats] = await Promise.all([getMyRank(), getStudentAnalytics()]);
      setMyRank(rank);
      setAnalytics(stats);
    } catch (err) { console.error(err); }
    finally { setRecalculating(false); }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Welcome */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Dashboard</h1>
            <p className="text-gray-400 mt-1">
              {user.name} · <span className="text-indigo-400 capitalize">{user.role}</span>
              {user.state && ` · ${user.state}`}
            </p>
          </div>
          <button onClick={handleRecalculate} disabled={recalculating}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50 mt-2">
            {recalculating ? "Updating..." : "↻ Refresh rank"}
          </button>
        </div>

        {/* Rank cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Indian rank"  value={myRank?.indian_rank ? `#${myRank.indian_rank}` : "—"}  color="indigo" icon="🇮🇳"/>
          <StatCard label={`${user.state || "State"} rank`} value={myRank?.state_rank ? `#${myRank.state_rank}` : "—"} color="purple" icon="📍"/>
          <StatCard label="XP points"    value={myRank?.xp.toFixed(0) || "0"}  color="amber"  icon="⭐"/>
          <StatCard label="Day streak"   value={`${analytics?.current_streak || 0} 🔥`} color="red" icon=""/>
        </div>

        {/* Analytics stats */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Courses enrolled" value={analytics.total_enrolled}   color="blue"   icon="📚"/>
            <StatCard label="Completed"        value={analytics.total_completed}  color="green"  icon="✅"/>
            <StatCard label="Quizzes passed"   value={analytics.passed_quizzes}  color="indigo" icon="✏️"/>
            <StatCard label="Assignments done" value={`${analytics.submitted_assignments}/${analytics.total_assignments}`} color="amber" icon="📝"/>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Score breakdown chart */}
          {myRank && (
            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold">Score Breakdown</h2>
                <span className="text-2xl font-bold text-white">{myRank.rank_score.toFixed(1)}</span>
              </div>
              <ScoreChart data={[
                { label: "Quiz (×0.4)",       value: myRank.quiz_score,       color: "#6366f1" },
                { label: "Assignment (×0.3)",  value: myRank.assignment_score, color: "#22c55e" },
                { label: "Completion (×0.15)", value: myRank.completion_score, color: "#f59e0b" },
                { label: "Streak (×0.15)",     value: myRank.streak_score,     color: "#a855f7" },
              ]}/>
              <div className="mt-4 flex justify-end">
                <Link href="/leaderboard" className="text-sm text-indigo-400 hover:text-indigo-300">
                  View leaderboard →
                </Link>
              </div>
            </div>
          )}

          {/* Progress rings */}
          {analytics && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-6">Performance</h2>
              <div className="flex flex-col gap-6 items-center">
                <ProgressRing value={analytics.avg_quiz_score} label="Avg quiz score" color="#6366f1"/>
                <ProgressRing value={analytics.avg_assignment_score} label="Avg assignment" color="#22c55e"/>
                <ProgressRing
                  value={analytics.total_enrolled > 0 ? (analytics.total_completed / analytics.total_enrolled) * 100 : 0}
                  label="Completion rate" color="#f59e0b"/>
              </div>
            </div>
          )}
        </div>

        {/* Activity calendar */}
        {analytics && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
            <ActivityCalendar streakDays={analytics.current_streak}/>
          </div>
        )}

        {/* My courses */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-white font-semibold">My Courses</h2>
            <Link href="/courses" className="text-indigo-400 text-sm hover:text-indigo-300">Browse more →</Link>
          </div>
          {fetching ? (
            <div className="p-8 text-center text-gray-400 animate-pulse">Loading...</div>
          ) : enrollments.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-4xl mb-3">📚</p>
              <p className="text-gray-400 mb-4">No courses yet</p>
              <Link href="/courses" className="text-indigo-400 text-sm">Browse courses →</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {enrollments.map((enr) => {
                const course = courses[enr.course_id];
                return (
                  <Link key={enr.id} href={`/courses/${enr.course_id}`}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-800/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{course?.title || "..."}</p>
                        <div className="mt-2 w-48">
                          <ProgressBar progress={enr.progress} size="sm" showLabel={false}/>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-indigo-400 text-sm font-medium">{Math.round(enr.progress)}%</p>
                        <p className="text-gray-500 text-xs">{enr.is_completed ? "✅ Completed" : "In progress"}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}