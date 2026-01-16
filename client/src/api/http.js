// client/src/api/http.js
import axios from "axios";

/**
 * ✅ Set in Vercel:
 * VITE_API_URL = https://ai-app-8ale.onrender.com
 * (NO trailing /api)
 */
const baseURL =
  import.meta.env.VITE_API_URL || "/api";

// remove trailing slash if present
const origin = String(API_ORIGIN).replace(/\/+$/, "");

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Optional: log only real errors (NOT /auth/me 401 on first load)
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
