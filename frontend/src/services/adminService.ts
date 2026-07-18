import api from "@/lib/axiosInstance";

export interface AdminUserEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  country: string | null;
  state: string | null;
  district: string | null;
  xp: number;
  rank_score: number;
  streak_days: number;
  is_active: boolean;
  is_verified: boolean;
  avatar_url: string | null;
  bio: string | null;
  created_at: string | null;
  last_login: string | null;
}

export interface AdminLeaderboardResponse {
  entries: AdminUserEntry[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface GeographicStats {
  total_users: number;
  average_score: number;
  top_performer: string | null;
  top_score: number;
}

export interface StateDistrictOption {
  name: string;
  count: number;
}

export interface GeographicFilters {
  states: StateDistrictOption[];
  districts: StateDistrictOption[];
}

export interface UserDetailResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  country: string | null;
  state: string | null;
  district: string | null;
  xp: number;
  rank_score: number;
  streak_days: number;
  is_active: boolean;
  is_verified: boolean;
  avatar_url: string | null;
  bio: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_login: string | null;
  enrollments: Array<{
    id: string;
    course_id: string;
    course_title: string;
    progress: number;
    is_approved: boolean;
    is_completed: boolean;
    enrolled_at: string | null;
  }> | null;
  quiz_attempts_count: number;
  submissions_count: number;
  assigned_mentor: { id: string; name: string; email: string } | null;
  courses_count: number;
  assigned_students: Array<{
    id: string;
    name: string;
    email: string;
  }> | null;
}

export interface MentorOption {
  id: string;
  name: string;
  email: string;
}

export interface RemoveResponse {
  success: boolean;
  message: string;
  reference_id: string;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  target_name: string | null;
  target_email: string | null;
  target_role: string | null;
  details: string | null;
  reference_id: string;
  created_at: string | null;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
}

export async function getAdminLeaderboard(params: {
  role?: string;
  search?: string;
  state?: string;
  district?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  per_page?: number;
}): Promise<AdminLeaderboardResponse> {
  const res = await api.get("/admin/leaderboard", { params });
  return res.data;
}

export async function searchUsers(
  q: string,
  role?: string,
  limit = 10
): Promise<AdminUserEntry[]> {
  const params: Record<string, string | number> = { q, limit };
  if (role) params.role = role;
  const res = await api.get("/admin/search", { params });
  return res.data;
}

export async function getGeographicFilters(): Promise<GeographicFilters> {
  const res = await api.get("/admin/geographic-filters");
  return res.data;
}

export async function getDistrictsForState(state: string): Promise<StateDistrictOption[]> {
  const res = await api.get("/admin/districts-for-state", { params: { state } });
  return res.data;
}

export async function getGeographicStats(params: {
  role?: string;
  state?: string;
  district?: string;
}): Promise<GeographicStats> {
  const res = await api.get("/admin/geographic-stats", { params });
  return res.data;
}

export async function getUserDetail(userId: string): Promise<UserDetailResponse> {
  const res = await api.get(`/admin/user/${userId}`);
  return res.data;
}

export async function removeStudent(
  userId: string,
  data: { confirmation_name: string; admin_password: string }
): Promise<RemoveResponse> {
  const res = await api.delete(`/admin/remove-student/${userId}`, { data });
  return res.data;
}

export async function removeMentor(
  userId: string,
  data: {
    confirmation_name: string;
    admin_password: string;
    reassign_to?: string | null;
  }
): Promise<RemoveResponse> {
  const res = await api.delete(`/admin/remove-mentor/${userId}`, { data });
  return res.data;
}

export async function getMentorsForReassignment(
  excludeId?: string
): Promise<MentorOption[]> {
  const params: Record<string, string> = {};
  if (excludeId) params.exclude_id = excludeId;
  const res = await api.get("/admin/mentors-for-reassignment", { params });
  return res.data;
}

export async function getAuditLog(params?: {
  page?: number;
  per_page?: number;
  action?: string;
}): Promise<AuditLogResponse> {
  const res = await api.get("/admin/audit-log", { params });
  return res.data;
}
