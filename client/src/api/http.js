// client/src/api/http.js
import axios from "axios";

/**
 * In Vercel set:
 *   VITE_API_URL = https://ai-app-8ale.onrender.com
 * (NO trailing slash)
 *
 * This client will automatically talk to:
 *   https://ai-app-8ale.onrender.com/api
 *
 * Locally, Vite proxy uses "/api"
 */
function normalizeBase(url) {
  if (!url) return "";
  return url.replace(/\/+$/, ""); // remove trailing slash(es)
}

const raw = normalizeBase(import.meta.env.VITE_API_URL);

// If deployed (VITE_API_URL present): use `${VITE_API_URL}/api`
// If local dev: use "/api" (vite proxy)
const baseURL = raw ? `${raw}/api` : "/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Log only real errors (ignore expected 401 from /auth/me before login)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url || "";

    if (status === 401 && url.includes("/auth/me")) {
      return Promise.reject(err);
    }

    console.error("[api] error:", status, err?.response?.data || err?.message);
    return Promise.reject(err);
  }
);

export default api;
