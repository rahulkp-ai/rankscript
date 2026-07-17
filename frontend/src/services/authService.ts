import api from "@/lib/axiosInstance";
import axios from "axios";

const API = "/api";

export interface LoginData {
  email:    string;
  password: string;
}

export interface RegisterData {
  name:      string;
  email:     string;
  password:  string;
  role?:     string;
  state?:    string;
  district?: string;
  country?:  string;
}

export interface TokenResponse {
  access_token:  string;
  refresh_token: string;
  token_type:    string;
}

export interface UserProfile {
  id:          string;
  name:        string;
  email:       string;
  role:        "student" | "mentor" | "admin";
  state:       string | null;
  district:    string | null;
  country:     string | null;
  xp:          number;
  rank_score:  number;
  is_active:   boolean;
  is_verified: boolean;
  avatar_url:  string | null;
  created_at:  string | null;
}

export async function loginUser(data: LoginData): Promise<TokenResponse> {
  const res = await axios.post(`${API}/auth/login`, data);
  return res.data;
}

export async function registerUser(data: RegisterData): Promise<UserProfile> {
  const res = await axios.post(`${API}/auth/register`, data);
  return res.data;
}

export async function refreshToken(token: string): Promise<TokenResponse> {
  const res = await axios.post(`${API}/auth/refresh`, { refresh_token: token });
  return res.data;
}

export async function getMe(): Promise<UserProfile> {
  const res = await api.get(`/users/me`);
  return res.data;
}
