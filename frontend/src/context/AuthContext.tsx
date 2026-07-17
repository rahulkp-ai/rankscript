"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";

// All requests go to /api/* — proxied by Next.js to http://backend:8000/*.
// Never use NEXT_PUBLIC_API_URL directly: it contains "http://localhost:8000"
// which is unreachable from inside the frontend Docker container.
const API = "/api";

interface User {
  id:         string;
  name:       string;
  email:      string;
  role:       "student" | "mentor" | "admin";
  state:      string | null;
  district:   string | null;
  country:    string | null;
  xp:         number;
  rank_score: number;
}

interface AuthContextType {
  user:            User | null;
  loading:         boolean;
  isAuthenticated: boolean;
  login:           (email: string, password: string) => Promise<void>;
  register:        (data: { name: string; email: string; password: string; role?: string; state?: string; district?: string; country?: string }) => Promise<void>;
  logout:          () => void;
  refresh:         () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();
  const didInit               = useRef(false);

  const fetchMe = async (token: string): Promise<User | null> => {
    try {
      const res = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const init = async () => {
      const token = Cookies.get("access_token");
      if (!token) { setLoading(false); return; }

      const me = await fetchMe(token);
      if (me) {
        setUser(me);
      } else {
        const refreshToken = Cookies.get("refresh_token");
        if (refreshToken) {
          try {
            const res = await axios.post(`${API}/auth/refresh`, {
              refresh_token: refreshToken,
            });
            const newToken = res.data.access_token;
            Cookies.set("access_token", newToken, { expires: 1, sameSite: "strict" });
            const me2 = await fetchMe(newToken);
            if (me2) setUser(me2);
            else {
              Cookies.remove("access_token");
              Cookies.remove("refresh_token");
            }
          } catch {
            Cookies.remove("access_token");
            Cookies.remove("refresh_token");
          }
        } else {
          Cookies.remove("access_token");
        }
      }
      setLoading(false);
    };

    init();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, refresh_token } = res.data;
    const isSecure =
      typeof window !== "undefined" && window.location.protocol === "https:";
    Cookies.set("access_token",  access_token,  { expires: 1,  secure: isSecure, sameSite: "strict" });
    Cookies.set("refresh_token", refresh_token, { expires: 7, secure: isSecure, sameSite: "strict" });
    const me = await fetchMe(access_token);
    setUser(me);

    if (me?.role === "admin")        router.push("/admin/dashboard");
    else if (me?.role === "mentor")  router.push("/mentor/dashboard");
    else                             router.push("/student/dashboard");
  };

  const register = async (data: {
    name: string; email: string; password: string;
    role?: string; state?: string; district?: string; country?: string;
  }) => {
    await axios.post(`${API}/auth/register`, data);
    router.push("/auth/login");
  };

  const logout = () => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    setUser(null);
    router.push("/auth/login");
  };

  const refresh = async () => {
    const refreshToken = Cookies.get("refresh_token");
    if (!refreshToken) return;
    try {
      const res = await axios.post(`${API}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      const newToken = res.data.access_token;
      Cookies.set("access_token", newToken, { expires: 1, sameSite: "strict" });
      const me = await fetchMe(newToken);
      setUser(me);
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
