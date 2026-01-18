// client/src/api/http.js
import axios from "axios";

/**
 * Vercel:
 *   VITE_API_URL = https://ai-app-8ale.onrender.com
 * (NO trailing slash, NO /api)
 *
 * Local:
 *   use Vite proxy -> baseURL becomes "/api"
 */

function normalizeBase(url) {
  if (!url) return "";
  return String(url).trim().replace(/\/+$/, "");
}

const raw = normalizeBase(import.meta.env.VITE_API_URL);

// If deployed (VITE_API_URL present): use https://... (no /api here)
// If local: use "/api" and the proxy handles it
const baseURL = raw || "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

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
