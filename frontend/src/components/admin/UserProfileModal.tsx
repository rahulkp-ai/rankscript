"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { UserDetailResponse, getUserDetail } from "@/services/adminService";
import RankBadge from "@/components/ranking/RankBadge";

interface UserProfileModalProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  onRemoveStudent: (userId: string, name: string) => void;
  onRemoveMentor: (userId: string, name: string) => void;
}

export default function UserProfileModal({
  userId,
  open,
  onClose,
  onRemoveStudent,
  onRemoveMentor,
}: UserProfileModalProps) {
  const [user, setUser] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "details">("overview");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    setError(null);
    setActiveTab("overview");
    getUserDetail(userId)
      .then(setUser)
      .catch(() => setError("Failed to load user profile"))
      .finally(() => setLoading(false));
  }, [open, userId]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const formatDate = (d: string | null) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (d: string | null) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        ref={dialogRef}
        className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">User Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="p-8 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-800 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-56 bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400">{error}</p>
            </div>
          ) : user ? (
            <>
              {/* Profile header */}
              <div className="px-6 py-5 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-b border-gray-800">
                <div className="flex items-start gap-4">
                  <div className="relative w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                    {user.avatar_url ? (
                      <Image src={user.avatar_url} alt="" fill sizes="64px" className="object-cover" unoptimized />
                    ) : (
                      <span>{user.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-white">{user.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        user.role === "admin" ? "bg-red-900/50 text-red-400" :
                        user.role === "mentor" ? "bg-purple-900/50 text-purple-400" :
                        "bg-indigo-900/50 text-indigo-400"
                      }`}>
                        {user.role}
                      </span>
                      {user.is_active ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400">Active</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">Inactive</span>
                      )}
                      {user.is_verified && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-400">Verified</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{user.email}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>ID: {user.id.slice(0, 8)}...</span>
                      <span>Joined: {formatDate(user.created_at)}</span>
                      {user.state && <span>{[user.district, user.state].filter(Boolean).join(", ")}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {user.role === "student" && (
                      <button
                        onClick={() => onRemoveStudent(user.id, user.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-800 rounded-lg text-red-400 text-xs font-medium transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove Student
                      </button>
                    )}
                    {user.role === "mentor" && (
                      <button
                        onClick={() => onRemoveMentor(user.id, user.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-800 rounded-lg text-red-400 text-xs font-medium transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove Mentor
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-800 px-6">
                {(["overview", "activity", "details"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                      activeTab === tab
                        ? "border-indigo-500 text-indigo-400"
                        : "border-transparent text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-6">
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatBox label="Rank Score" value={user.rank_score.toFixed(1)} color="indigo" />
                      <StatBox label="XP" value={user.xp.toFixed(0)} color="purple" />
                      <StatBox label="Streak" value={`${user.streak_days}d`} color="amber" />
                      <StatBox
                        label={user.role === "student" ? "Enrolled" : "Courses"}
                        value={user.role === "student" ? String(user.enrollments?.length || 0) : String(user.courses_count)}
                        color="emerald"
                      />
                    </div>

                    {user.role === "student" && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <StatBox label="Quiz Attempts" value={String(user.quiz_attempts_count)} color="blue" />
                          <StatBox label="Submissions" value={String(user.submissions_count)} color="cyan" />
                        </div>

                        {user.enrollments && user.enrollments.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Enrollments</h4>
                            <div className="space-y-2">
                              {user.enrollments.map((e) => (
                                <div key={e.id} className="flex items-center justify-between px-4 py-2.5 bg-gray-800 rounded-lg">
                                  <div>
                                    <p className="text-sm text-white">{e.course_title}</p>
                                    <p className="text-xs text-gray-500">{formatDate(e.enrolled_at)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-indigo-500 rounded-full"
                                        style={{ width: `${e.progress}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-400 w-10 text-right">{e.progress.toFixed(0)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {user.role === "mentor" && user.assigned_students && user.assigned_students.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">
                          Associated Students ({user.assigned_students.length})
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {user.assigned_students.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 px-4 py-2 bg-gray-800 rounded-lg">
                              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
                                {s.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm text-white">{s.name}</p>
                                <p className="text-xs text-gray-500">{s.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {user.bio && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Bio</h4>
                        <p className="text-sm text-gray-300 bg-gray-800 rounded-lg px-4 py-3">{user.bio}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "activity" && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-400">Recent Activity Timeline</h4>
                    <div className="relative pl-6 border-l border-gray-800 space-y-4">
                      <TimelineItem
                        title="Account Created"
                        date={formatDateTime(user.created_at)}
                        icon="account"
                        color="indigo"
                      />
                      {user.last_login && (
                        <TimelineItem
                          title="Last Login"
                          date={formatDateTime(user.last_login)}
                          icon="login"
                          color="emerald"
                        />
                      )}
                      {user.updated_at && user.updated_at !== user.created_at && (
                        <TimelineItem
                          title="Profile Updated"
                          date={formatDateTime(user.updated_at)}
                          icon="edit"
                          color="blue"
                        />
                      )}
                      {user.role === "student" && user.enrollments?.map((e) => (
                        <TimelineItem
                          key={e.id}
                          title={`Enrolled in ${e.course_title}`}
                          date={formatDateTime(e.enrolled_at)}
                          icon="course"
                          color="purple"
                        />
                      ))}
                      {user.streak_days > 0 && (
                        <TimelineItem
                          title={`${user.streak_days}-day streak active`}
                          date="Current"
                          icon="streak"
                          color="amber"
                        />
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "details" && (
                  <div className="space-y-3">
                    <DetailRow label="Full Name" value={user.name} />
                    <DetailRow label="Email" value={user.email} />
                    <DetailRow label="User ID" value={user.id} />
                    <DetailRow label="Role" value={user.role} />
                    <DetailRow label="Country" value={user.country || "N/A"} />
                    <DetailRow label="State" value={user.state || "N/A"} />
                    <DetailRow label="District" value={user.district || "N/A"} />
                    <DetailRow label="Account Status" value={user.is_active ? "Active" : "Inactive"} />
                    <DetailRow label="Verified" value={user.is_verified ? "Yes" : "No"} />
                    <DetailRow label="Rank Score" value={user.rank_score.toFixed(2)} />
                    <DetailRow label="XP" value={user.xp.toFixed(0)} />
                    <DetailRow label="Streak Days" value={String(user.streak_days)} />
                    <DetailRow label="Created" value={formatDateTime(user.created_at)} />
                    <DetailRow label="Last Updated" value={formatDateTime(user.updated_at)} />
                    <DetailRow label="Last Login" value={formatDateTime(user.last_login)} />
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    indigo: "text-indigo-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    cyan: "text-cyan-400",
  };

  return (
    <div className="bg-gray-800 rounded-xl p-3 text-center">
      <p className={`font-bold text-lg ${colors[color] || "text-white"}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 rounded-lg">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  );
}

function TimelineItem({
  title,
  date,
  icon,
  color,
}: {
  title: string;
  date: string;
  icon: string;
  color: string;
}) {
  const dotColors: Record<string, string> = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    amber: "bg-amber-500",
  };

  return (
    <div className="relative">
      <div className={`absolute -left-[25px] w-2.5 h-2.5 rounded-full ${dotColors[color] || "bg-gray-500"}`} />
      <p className="text-sm text-white">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{date}</p>
    </div>
  );
}
