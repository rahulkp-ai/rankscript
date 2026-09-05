"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/common/Toast";
import { AuditLogEntry, getAuditLog } from "@/services/adminService";

const ACTION_LABELS: Record<string, string> = {
  remove_student: "Removed Student",
  remove_mentor: "Removed Mentor",
};

const ACTION_STYLES: Record<string, string> = {
  remove_student: "bg-red-900/50 text-red-400 border-red-800/60",
  remove_mentor: "bg-orange-900/50 text-orange-400 border-orange-800/60",
};

export default function AdminAuditLogPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [actionFilter, setActionFilter] = useState("");
  const [fetching, setFetching] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // Auth guard — admin only
  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
    if (!authLoading && user && user.role !== "admin") router.push("/dashboard");
  }, [authLoading, user, router]);

  const loadAuditLog = useCallback(async () => {
    if (user?.role !== "admin") return;
    setFetching(true);
    try {
      const data = await getAuditLog({
        page,
        per_page: perPage,
        action: actionFilter || undefined,
      });
      setEntries(data.entries);
      setTotal(data.total);
    } catch {
      addToast("error", "Failed to load audit log");
    } finally {
      setFetching(false);
    }
  }, [user, page, perPage, actionFilter, addToast]);

  useEffect(() => {
    loadAuditLog();
  }, [loadAuditLog]);

  const handleActionFilterChange = (value: string) => {
    setActionFilter(value);
    setPage(1);
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

  const copyReference = async (refId: string) => {
    try {
      await navigator.clipboard.writeText(refId);
      addToast("success", "Reference ID copied");
    } catch {
      // clipboard API unavailable — silently ignore
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Audit Log</h1>
          <p className="text-gray-400 mt-1">
            A record of every destructive admin action, newest first
          </p>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[200px]">
              <label className="text-xs text-gray-500 mb-1 block">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => handleActionFilterChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Actions</option>
                <option value="remove_student">Removed Student</option>
                <option value="remove_mentor">Removed Mentor</option>
              </select>
            </div>

            <div className="min-w-[100px]">
              <label className="text-xs text-gray-500 mb-1 block">Per Page</label>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg text-sm bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {actionFilter && (
              <button
                onClick={() => handleActionFilterChange("")}
                className="px-4 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-800/50 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider font-medium">
            <div className="col-span-2">When</div>
            <div className="col-span-2">Action</div>
            <div className="col-span-3">Target</div>
            <div className="col-span-3">Details</div>
            <div className="col-span-2 text-right">Reference</div>
          </div>

          {fetching ? (
            <div className="divide-y divide-gray-800">
              {[...Array(perPage > 8 ? 8 : perPage)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center animate-pulse">
                  <div className="col-span-2"><div className="h-3 bg-gray-800 rounded w-3/4" /></div>
                  <div className="col-span-2"><div className="h-5 bg-gray-800 rounded-full w-24" /></div>
                  <div className="col-span-3 space-y-1.5">
                    <div className="h-3 bg-gray-800 rounded w-full" />
                    <div className="h-3 bg-gray-800 rounded w-2/3" />
                  </div>
                  <div className="col-span-3"><div className="h-3 bg-gray-800 rounded w-full" /></div>
                  <div className="col-span-2 flex justify-end"><div className="h-3 bg-gray-800 rounded w-20" /></div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-400">
                {actionFilter ? "No matching audit entries found" : "No admin actions recorded yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {entries.map((entry) => (
                <div key={entry.id}>
                  {/* Mobile card layout */}
                  <div className="md:hidden px-4 py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          ACTION_STYLES[entry.action] || "bg-gray-800 text-gray-400 border-gray-700"
                        }`}
                      >
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                      <span className="text-xs text-gray-500">{formatDateTime(entry.created_at)}</span>
                    </div>
                    <p className="text-sm text-white">
                      {entry.target_name || "Unknown"}{" "}
                      <span className="text-gray-500 text-xs">({entry.target_role || "—"})</span>
                    </p>
                    {entry.target_email && (
                      <p className="text-xs text-gray-500">{entry.target_email}</p>
                    )}
                    {entry.details && <p className="text-xs text-gray-400">{entry.details}</p>}
                    <button
                      onClick={() => copyReference(entry.reference_id)}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Ref: {entry.reference_id}
                    </button>
                  </div>

                  {/* Desktop row layout */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-800/30 transition-colors">
                    <div className="col-span-2 text-sm text-gray-400">
                      {formatDateTime(entry.created_at)}
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          ACTION_STYLES[entry.action] || "bg-gray-800 text-gray-400 border-gray-700"
                        }`}
                      >
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="text-sm text-white truncate">{entry.target_name || "Unknown"}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {entry.target_email || "—"} {entry.target_role ? `· ${entry.target_role}` : ""}
                      </p>
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="text-xs text-gray-400 truncate">{entry.details || "—"}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <button
                        onClick={() => copyReference(entry.reference_id)}
                        className="text-xs text-indigo-400 hover:underline font-mono"
                        title="Click to copy"
                      >
                        {entry.reference_id}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!fetching && entries.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-800 bg-gray-800/20">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-2.5 py-1.5 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm text-gray-400 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-2.5 py-1.5 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}