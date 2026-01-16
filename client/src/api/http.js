// client/src/api/http.js
import axios from "axios";

/**
 * If VITE_API_URL is set to https://ai-app-8ale.onrender.com
 * then the API base becomes https://ai-app-8ale.onrender.com/api
 *
 * If VITE_API_URL is not set, we use "/api" so Vercel rewrites can proxy it.
 */
const raw = import.meta.env.VITE_API_URL;

// ensure no trailing slash
const apiOrigin = raw ? String(raw).replace(/\/+$/, "") : "";

// IMPORTANT: your backend routes are under /api/*
const baseURL = apiOrigin ? `${apiOrigin}/api` : "/api";

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
