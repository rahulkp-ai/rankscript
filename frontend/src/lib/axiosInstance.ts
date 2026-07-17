import axios from "axios";
import Cookies from "js-cookie";

// ALL browser requests go to /api/* on the same origin (port 3000).
// Next.js rewrites /api/* → http://backend:8000/* server-side inside Docker.
// The browser never touches port 8000. No CORS needed.
// Do NOT use NEXT_PUBLIC_API_URL here — it contains "http://localhost:8000"
// which breaks inside Docker where localhost:8000 is unreachable from the frontend container.
const API = "/api";

const api = axios.create({
  baseURL: API,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = Cookies.get("refresh_token");

      if (!refreshToken) {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        if (typeof window !== "undefined") window.location.href = "/auth/login";
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push((token: string | null) => {
            if (!token) { reject(err); return; }
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const res = await axios.post(
          `/api/auth/refresh`,
          { refresh_token: refreshToken },
          { withCredentials: false }
        );
        const newToken = res.data.access_token;
        const isSecure =
          typeof window !== "undefined" && window.location.protocol === "https:";
        Cookies.set("access_token", newToken, {
          expires: 1,
          secure: isSecure,
          sameSite: "strict",
        });
        queue.forEach((cb) => cb(newToken));
        queue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        queue.forEach((cb) => cb(null));
        queue = [];
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        if (typeof window !== "undefined") window.location.href = "/auth/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;
