"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import StatCard from "@/components/analytics/StatCard";
import ScoreChart from "@/components/analytics/ScoreChart";
import ProgressRing from "@/components/analytics/ProgressRing";
import RankBadge from "@/components/ranking/RankBadge";
import { useAuth } from "@/hooks/useAuth";
import { getAdminAnalytics, AdminAnalytics } from "@/services/analyticsService";
import { getPendingCourses, Course } from "@/services/courseService";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [pending,   setPending]   = useState<Course[]>([]);
  const [fetching,  setFetching]  = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
    if (!loading && user?.role !== "admin") router.push("/dashboard");
  }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const [a, p] = await Promise.all([getAdminAnalytics(), getPendingCourses()]);
        setAnalytics(a);
        setPending(p);
      } catch (err) { console.error(err); }
      finally { setFetching(false); }
    };
    if (user?.role === "admin") load();
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">Platform overview and management</p>
        </div>

        {fetching ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse h-24"/>
            ))}
          </div>
        ) : analytics && (
          <>
            {/* User stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total users"    value={analytics.total_users}    color="indigo" icon="👥"/>
              <StatCard label="Students"       value={analytics.total_students} color="blue"   icon="🎓"/>
              <StatCard label="Mentors"        value={analytics.total_mentors}  color="purple" icon="👨‍🏫"/>
              <StatCard label="Admins"         value={analytics.total_admins}   color="red"    icon="🛠️"/>
            </div>

            {/* Platform stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total courses"    value={analytics.total_courses}       color="green"  icon="📚"/>
              <StatCard label="Approved"         value={analytics.approved_courses}    color="green"  icon="✅"/>
              <StatCard label="Pending approval" value={analytics.pending_courses}     color="amber"  icon="⏳"/>
              <StatCard label="Enrollments"      value={analytics.total_enrollments}   color="indigo" icon="📋"/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

              {/* Platform metrics chart */}
              <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-6">Platform Metrics</h2>
                <ScoreChart data={[
                  { label: "Completion rate",    value: analytics.platform_completion_rate, color: "#6366f1" },
                  { label: "Approved courses %", value: analytics.total_courses > 0 ? (analytics.approved_courses / analytics.total_courses * 100) : 0, color: "#22c55e" },
                  { label: "Active students %",  value: analytics.total_users > 0 ? (analytics.total_students / analytics.total_users * 100) : 0, color: "#f59e0b" },
                ]}/>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-gray-800 rounded-xl p-4 text-center">
                    <p className="text-blue-400 font-bold text-2xl">{analytics.total_quiz_attempts}</p>
                    <p className="text-gray-500 text-xs mt-1">Quiz attempts</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 text-center">
                    <p className="text-amber-400 font-bold text-2xl">{analytics.total_submissions}</p>
                    <p className="text-gray-500 text-xs mt-1">Submissions</p>
                  </div>
                </div>
              </div>

              {/* Progress ring + actions */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-6">Completion Rate</h2>
                <div className="flex justify-center mb-6">
                  <ProgressRing
                    value={analytics.platform_completion_rate}
                    size={120} stroke={10}
                    color="#6366f1"
                    label="Platform completion"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/admin/approvals"
                    className="flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
                    <span className="text-white text-sm">Course approvals</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      pending.length > 0 ? "bg-yellow-900/50 text-yellow-400" : "bg-gray-700 text-gray-400"
                    }`}>
                      {pending.length} pending
                    </span>
                  </Link>
                  <Link href="/leaderboard"
                    className="flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
                    <span className="text-white text-sm">Leaderboard</span>
                    <span className="text-xs text-indigo-400">View →</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Pending courses alert */}
            {pending.length > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-yellow-400 font-semibold">
                      {pending.length} course{pending.length > 1 ? "s" : ""} waiting for approval
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {pending.map((c) => c.title).join(", ")}
                    </p>
                  </div>
                  <Link href="/admin/approvals"
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0 ml-4">
                    Review now →
                  </Link>
                </div>
              </div>
            )}

            {/* Top students */}
            {analytics.top_students.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-white font-semibold">Top Students</h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {analytics.top_students.map((student, idx) => (
                    <div key={student.user_id} className="flex items-center gap-4 px-6 py-4">
                      <RankBadge rank={idx + 1} size="sm"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{student.name}</p>
                        {(student.state || student.district) && (
                          <p className="text-gray-500 text-xs">
                            {[student.district, student.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-indigo-400 font-bold text-sm">{student.rank_score.toFixed(1)}</p>
                        <p className="text-gray-500 text-xs">{student.xp.toFixed(0)} XP</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}