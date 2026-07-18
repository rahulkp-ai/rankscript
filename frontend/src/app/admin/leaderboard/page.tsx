"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import RankBadge from "@/components/ranking/RankBadge";
import UserProfileModal from "@/components/admin/UserProfileModal";
import RemoveConfirmDialog from "@/components/admin/RemoveConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/common/Toast";
import {
  AdminUserEntry,
  GeographicStats,
  StateDistrictOption,
  getAdminLeaderboard,
  searchUsers,
  getGeographicFilters,
  getDistrictsForState,
  getGeographicStats,
  removeStudent,
  removeMentor,
  getMentorsForReassignment,
  MentorOption,
} from "@/services/adminService";

type Tab = "student" | "mentor";

export default function AdminLeaderboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>("student");

  // Data
  const [entries, setEntries] = useState<AdminUserEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [fetching, setFetching] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [sortBy, setSortBy] = useState("rank_score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Geographic data
  const [states, setStates] = useState<StateDistrictOption[]>([]);
  const [districts, setDistricts] = useState<StateDistrictOption[]>([]);
  const [geoStats, setGeoStats] = useState<GeographicStats | null>(null);

  // Search autocomplete
  const [searchResults, setSearchResults] = useState<AdminUserEntry[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Profile modal
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  // Remove dialog
  const [removeType, setRemoveType] = useState<"student" | "mentor">("student");
  const [removeUserId, setRemoveUserId] = useState("");
  const [removeUserName, setRemoveUserName] = useState("");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [mentorOptions, setMentorOptions] = useState<MentorOption[]>([]);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
    if (!authLoading && user && user.role !== "admin") router.push("/dashboard");
  }, [authLoading, user, router]);

  // Load geographic filters
  useEffect(() => {
    if (user?.role !== "admin") return;
    getGeographicFilters()
      .then((data) => setStates(data.states))
      .catch(() => {});
  }, [user]);

  // Load districts when state changes
  useEffect(() => {
    if (!selectedState) {
      setDistricts([]);
      setSelectedDistrict("");
      return;
    }
    getDistrictsForState(selectedState)
      .then(setDistricts)
      .catch(() => {});
  }, [selectedState]);

  // Load leaderboard
  const loadLeaderboard = useCallback(async () => {
    if (user?.role !== "admin") return;
    setFetching(true);
    try {
      const data = await getAdminLeaderboard({
        role: activeTab,
        search: search || undefined,
        state: selectedState || undefined,
        district: selectedDistrict || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        per_page: perPage,
      });
      setEntries(data.entries);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch {
      addToast("error", "Failed to load leaderboard data");
    } finally {
      setFetching(false);
    }
  }, [user, activeTab, search, selectedState, selectedDistrict, sortBy, sortOrder, page, perPage, addToast]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Load geographic stats
  useEffect(() => {
    if (user?.role !== "admin") return;
    getGeographicStats({
      role: activeTab,
      state: selectedState || undefined,
      district: selectedDistrict || undefined,
    })
      .then(setGeoStats)
      .catch(() => {});
  }, [user, activeTab, selectedState, selectedDistrict]);

  // Search autocomplete
  const handleSearchInput = (value: string) => {
    setSearch(value);
    setPage(1);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length < 1) {
      setSearchResults([]);
      setShowAutocomplete(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchUsers(value, activeTab, 8);
        setSearchResults(results);
        setShowAutocomplete(true);
      } catch {
        // silently fail
      }
    }, 300);
  };

  // Close autocomplete on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Tab switch resets filters
  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
    setSelectedState("");
    setSelectedDistrict("");
    setSearchResults([]);
    setShowAutocomplete(false);
  };

  // Remove handlers
  const handleRemoveStudent = (userId: string, name: string) => {
    setRemoveType("student");
    setRemoveUserId(userId);
    setRemoveUserName(name);
    setMentorOptions([]);
    setShowRemoveDialog(true);
    setShowProfile(false);
  };

  const handleRemoveMentor = async (userId: string, name: string) => {
    setRemoveType("mentor");
    setRemoveUserId(userId);
    setRemoveUserName(name);
    setShowProfile(false);
    try {
      const mentors = await getMentorsForReassignment(userId);
      setMentorOptions(mentors);
    } catch {
      setMentorOptions([]);
    }
    setShowRemoveDialog(true);
  };

  const handleConfirmRemove = async (data: {
    confirmationName: string;
    adminPassword: string;
    reassignTo?: string | null;
  }) => {
    setRemoveLoading(true);
    try {
      let result;
      if (removeType === "student") {
        result = await removeStudent(removeUserId, {
          confirmation_name: data.confirmationName,
          admin_password: data.adminPassword,
        });
      } else {
        result = await removeMentor(removeUserId, {
          confirmation_name: data.confirmationName,
          admin_password: data.adminPassword,
          reassign_to: data.reassignTo,
        });
      }
      addToast("success", `${result.message} (Ref: ${result.reference_id})`);
      setShowRemoveDialog(false);
      loadLeaderboard();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      addToast("error", error?.response?.data?.detail || "Failed to remove user");
    } finally {
      setRemoveLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedState("");
    setSelectedDistrict("");
    setPage(1);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Leaderboard</h1>
          <p className="text-gray-400 mt-1">Manage and view all students and mentors</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleTabSwitch("student")}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "student"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Students
              {activeTab === "student" && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{total}</span>
              )}
            </span>
          </button>
          <button
            onClick={() => handleTabSwitch("mentor")}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "mentor"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Mentors
              {activeTab === "mentor" && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{total}</span>
              )}
            </span>
          </button>
        </div>

        {/* Aggregate Stats */}
        {geoStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">Total {activeTab === "student" ? "Students" : "Mentors"}</p>
              <p className="text-white font-bold text-2xl">{geoStats.total_users}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">Average Score</p>
              <p className="text-indigo-400 font-bold text-2xl">{geoStats.average_score.toFixed(1)}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">Top Performer</p>
              <p className="text-emerald-400 font-bold text-lg truncate">{geoStats.top_performer || "N/A"}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">Top Score</p>
              <p className="text-amber-400 font-bold text-2xl">{geoStats.top_score.toFixed(1)}</p>
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div ref={searchRef} className="relative flex-1 min-w-[200px]">
              <label className="text-xs text-gray-500 mb-1 block">Search</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowAutocomplete(true)}
                  placeholder="Name, email, or ID..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg text-sm bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(""); setSearchResults([]); setShowAutocomplete(false); setPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {/* Autocomplete dropdown */}
              {showAutocomplete && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-30 overflow-hidden">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSearch(r.name);
                        setShowAutocomplete(false);
                        setPage(1);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-700 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white flex-shrink-0">
                        {r.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{r.name}</p>
                        <p className="text-xs text-gray-500 truncate">{r.email}</p>
                      </div>
                      <span className="text-xs text-indigo-400 flex-shrink-0">{r.rank_score.toFixed(1)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* State filter */}
            <div className="min-w-[160px]">
              <label className="text-xs text-gray-500 mb-1 block">State</label>
              <select
                value={selectedState}
                onChange={(e) => { setSelectedState(e.target.value); setSelectedDistrict(""); setPage(1); }}
                className="w-full px-3 py-2 rounded-lg text-sm bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All States</option>
                {states.map((s) => (
                  <option key={s.name} value={s.name}>{s.name} ({s.count})</option>
                ))}
              </select>
            </div>

            {/* District filter */}
            <div className="min-w-[160px]">
              <label className="text-xs text-gray-500 mb-1 block">District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => { setSelectedDistrict(e.target.value); setPage(1); }}
                disabled={!selectedState}
                className="w-full px-3 py-2 rounded-lg text-sm bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="">All Districts</option>
                {districts.map((d) => (
                  <option key={d.name} value={d.name}>{d.name} ({d.count})</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="min-w-[140px]">
              <label className="text-xs text-gray-500 mb-1 block">Sort By</label>
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split(":");
                  setSortBy(by);
                  setSortOrder(order as "asc" | "desc");
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg text-sm bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="rank_score:desc">Score (High to Low)</option>
                <option value="rank_score:asc">Score (Low to High)</option>
                <option value="xp:desc">XP (High to Low)</option>
                <option value="name:asc">Name (A-Z)</option>
                <option value="name:desc">Name (Z-A)</option>
                <option value="created_at:desc">Newest First</option>
                <option value="created_at:asc">Oldest First</option>
                <option value="streak_days:desc">Streak (High to Low)</option>
              </select>
            </div>

            {/* Per page */}
            <div className="min-w-[100px]">
              <label className="text-xs text-gray-500 mb-1 block">Per Page</label>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="w-full px-3 py-2 rounded-lg text-sm bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* View All button */}
            {(search || selectedState || selectedDistrict) && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                View All
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-800/50 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider font-medium">
            <div className="col-span-1">Rank</div>
            <div className="col-span-3">User</div>
            <div className="col-span-2">Contact</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-1 text-center">Score</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Loading skeleton */}
          {fetching ? (
            <div className="divide-y divide-gray-800">
              {[...Array(perPage > 10 ? 10 : perPage)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center animate-pulse">
                  <div className="col-span-1"><div className="w-6 h-6 bg-gray-800 rounded-full" /></div>
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-800 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 bg-gray-800 rounded w-3/4" />
                      <div className="h-3 bg-gray-800 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <div className="h-3 bg-gray-800 rounded w-full" />
                    <div className="h-3 bg-gray-800 rounded w-2/3" />
                  </div>
                  <div className="col-span-2"><div className="h-3 bg-gray-800 rounded w-3/4" /></div>
                  <div className="col-span-1"><div className="h-4 bg-gray-800 rounded w-10 mx-auto" /></div>
                  <div className="col-span-1"><div className="h-5 bg-gray-800 rounded-full w-14 mx-auto" /></div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <div className="h-7 bg-gray-800 rounded-lg w-16" />
                    <div className="h-7 bg-gray-800 rounded-lg w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">{activeTab === "student" ? "🎓" : "👨‍🏫"}</p>
              <p className="text-gray-400">
                {search || selectedState || selectedDistrict
                  ? "No users found matching your filters"
                  : `No ${activeTab}s found`}
              </p>
              {(search || selectedState || selectedDistrict) && (
                <button onClick={resetFilters} className="text-indigo-400 text-sm mt-2 hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {entries.map((entry, idx) => {
                const rank = (page - 1) * perPage + idx + 1;
                return (
                  <div
                    key={entry.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 items-center hover:bg-gray-800/30 transition-colors"
                  >
                    {/* Mobile card layout */}
                    <div className="md:hidden flex items-start gap-3">
                      <RankBadge rank={rank} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="relative w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm text-white flex-shrink-0 overflow-hidden">
                            {entry.avatar_url ? (
                              <Image src={entry.avatar_url} alt="" fill sizes="32px" className="object-cover" unoptimized />
                            ) : (
                              entry.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm truncate">{entry.name}</p>
                            <p className="text-gray-500 text-xs truncate">{entry.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>{entry.rank_score.toFixed(1)} pts</span>
                          <span>{entry.xp.toFixed(0)} XP</span>
                          {entry.state && <span>{[entry.district, entry.state].filter(Boolean).join(", ")}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => { setProfileUserId(entry.id); setShowProfile(true); }}
                            className="px-2.5 py-1 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-800 rounded-lg text-indigo-400 text-xs transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() =>
                              activeTab === "student"
                                ? handleRemoveStudent(entry.id, entry.name)
                                : handleRemoveMentor(entry.id, entry.name)
                            }
                            className="px-2.5 py-1 bg-red-900/40 hover:bg-red-900/60 border border-red-800 rounded-lg text-red-400 text-xs transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop row layout */}
                    <div className="hidden md:block col-span-1">
                      <RankBadge rank={rank} size="sm" />
                    </div>
                    <div className="hidden md:flex col-span-3 items-center gap-3">
                      <div className="relative w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-sm text-white flex-shrink-0 overflow-hidden">
                        {entry.avatar_url ? (
                          <Image src={entry.avatar_url} alt="" fill sizes="36px" className="object-cover" unoptimized />
                        ) : (
                          entry.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm truncate">{entry.name}</p>
                        <p className="text-gray-500 text-xs truncate">ID: {entry.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="hidden md:block col-span-2">
                      <p className="text-gray-300 text-xs truncate">{entry.email}</p>
                      <p className="text-gray-500 text-xs">{formatDate(entry.created_at)}</p>
                    </div>
                    <div className="hidden md:block col-span-2">
                      <p className="text-gray-400 text-xs truncate">
                        {[entry.district, entry.state].filter(Boolean).join(", ") || "N/A"}
                      </p>
                    </div>
                    <div className="hidden md:block col-span-1 text-center">
                      <p className="text-white font-bold text-sm">{entry.rank_score.toFixed(1)}</p>
                      <p className="text-gray-500 text-xs">{entry.xp.toFixed(0)} XP</p>
                    </div>
                    <div className="hidden md:flex col-span-1 justify-center">
                      {entry.is_active ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400">Active</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">Inactive</span>
                      )}
                    </div>
                    <div className="hidden md:flex col-span-2 justify-end gap-2">
                      <button
                        onClick={() => { setProfileUserId(entry.id); setShowProfile(true); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-800 rounded-lg text-indigo-400 text-xs font-medium transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={() =>
                          activeTab === "student"
                            ? handleRemoveStudent(entry.id, entry.name)
                            : handleRemoveMentor(entry.id, entry.name)
                        }
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-800 rounded-lg text-red-400 text-xs font-medium transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
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

      {/* Profile Modal */}
      <UserProfileModal
        userId={profileUserId}
        open={showProfile}
        onClose={() => setShowProfile(false)}
        onRemoveStudent={handleRemoveStudent}
        onRemoveMentor={handleRemoveMentor}
      />

      {/* Remove Confirmation Dialog */}
      <RemoveConfirmDialog
        open={showRemoveDialog}
        type={removeType}
        userName={removeUserName}
        userId={removeUserId}
        mentors={mentorOptions}
        loading={removeLoading}
        onConfirm={handleConfirmRemove}
        onCancel={() => setShowRemoveDialog(false)}
      />
    </div>
  );
}
