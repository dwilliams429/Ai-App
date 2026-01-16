// client/src/api/http.js
import axios from "axios";

/**
 * In Vercel env vars set:
 * VITE_API_URL = https://ai-app-8ale.onrender.com
 * (NO trailing slash, NO /api)
 */
const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// If VITE_API_URL exists, call the server directly.
// Otherwise (local dev / same origin with rewrites), fall back to "/api".
const baseURL = API_ORIGIN ? `${API_ORIGIN}/api` : "/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url || "";

    if (status === 401 && url.includes("/auth/me")) return Promise.reject(err);

    console.error("[api] error:", status, err?.response?.data || err?.message);
    return Promise.reject(err);
  }
);

export default api;
