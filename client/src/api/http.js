// client/src/api/http.js
import axios from "axios";

/**
 * Vercel Env Var:
 *   VITE_API_URL = https://ai-app-8ale.onrender.com
 * (NO trailing /)
 *
 * We will call the backend via /api/* routes.
 * If VITE_API_URL is set -> https://.../api
 * Else (local/dev) -> /api  (so vercel.json rewrites can work)
 */
const API_ORIGIN = import.meta.env.VITE_API_URL
  ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, "")
  : "";

const baseURL = API_ORIGIN ? `${API_ORIGIN}/api` : "/api";

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
