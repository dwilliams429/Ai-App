// client/src/api/http.js
import axios from "axios";

/**
 * PRODUCTION (Vercel):
 *   Use same-origin "/api" so Vercel rewrites proxy to Render.
 *
 * DEVELOPMENT (local):
 *   Use VITE_API_URL if provided, else http://localhost:5050
 */

const isProd = import.meta.env.PROD;

function trimSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

const devOrigin = trimSlash(import.meta.env.VITE_API_URL || "http://localhost:5050");
const baseURL = isProd ? "/api" : `${devOrigin}/api`;

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

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
