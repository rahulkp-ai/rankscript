import api from "@/lib/axiosInstance";

export interface LeaderboardEntry {
  rank:       number;
  user_id:    string;
  name:       string;
  rank_score: number;
  xp:         number;
  state:      string | null;
  district:   string | null;
  is_me:      boolean;
}

export interface LeaderboardResponse {
  entries:  LeaderboardEntry[];
  total:    number;
  my_rank:  number | null;
  my_score: number | null;
}

export interface MyRankResponse {
  indian_rank:      number | null;
  state_rank:       number | null;
  district_rank:    number | null;
  rank_score:       number;
  quiz_score:       number;
  assignment_score: number;
  completion_score: number;
  streak_score:     number;
  xp:               number;
  streak_days:      number;
}

export async function getIndianLeaderboard(
  skip = 0,
  limit = 50
): Promise<LeaderboardResponse> {
  const res = await api.get(`/rankings/global?skip=${skip}&limit=${limit}`);
  return res.data;
}

export async function getStateLeaderboard(
  state: string
): Promise<LeaderboardResponse> {
  const res = await api.get(`/rankings/state/${encodeURIComponent(state)}`);
  return res.data;
}

export async function getDistrictLeaderboard(
  district: string
): Promise<LeaderboardResponse> {
  const res = await api.get(`/rankings/district/${encodeURIComponent(district)}`);
  return res.data;
}

export async function getMyRank(): Promise<MyRankResponse> {
  const res = await api.get(`/rankings/me`);
  return res.data;
}

export async function recalculateMyRank(): Promise<{ rank_score: number }> {
  const res = await api.post(`/rankings/recalculate`, {});
  return res.data;
}