// client/api/http.js
import axios from "axios";

/**
 * PRODUCTION (Vercel):
 *   Use same-origin "/api" so Vercel rewrites proxy to Render.
 *   This avoids CORS + third-party cookie issues.
 *
 * DEVELOPMENT (local):
 *   If VITE_API_URL is set, use it (e.g. "http://localhost:5050" or your Render URL).
 *   Otherwise default to http://localhost:5050
 */

const isProd = import.meta.env.PROD;

function trimSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

const devOrigin = trimSlash(import.meta.env.VITE_API_URL || "http://localhost:5050");

// In prod we want Vercel proxy:
const baseURL = isProd ? "/api" : `${devOrigin}/api`;

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helpful debug while deploying (you can remove later)
api.interceptors.request.use((config) => {
  const method = (config.method || "GET").toUpperCase();
  const url = `${config.baseURL || ""}${config.url || ""}`;
  console.log(`[api] ${method} ${url}`, config.data ?? "");
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("[api] error:", err?.response?.status, err?.response?.data || err?.message);
    return Promise.reject(err);
  }
);

export default api;
