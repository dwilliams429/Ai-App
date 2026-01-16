import axios from "axios";

/**
 * ✅ Option A (recommended with your vercel.json rewrite):
 * Leave VITE_API_URL unset in Vercel and use "/api" so Vercel rewrites handle it.
 *
 * ✅ Option B (direct):
 * VITE_API_URL = https://ai-app-8ale.onrender.com/api
 */
const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url || "";

    // Ignore expected 401 from /auth/me before login
    if (status === 401 && url.includes("/auth/me")) {
      return Promise.reject(err);
    }

    console.error("[api] error:", status, err?.response?.data || err?.message);
    return Promise.reject(err);
  }
);

export default api;
