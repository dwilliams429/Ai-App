// client/api/http.js
import axios from "axios";

// We route all API calls through Vercel rewrites:
//   /api/*  ->  Render backend
// This avoids cross-origin issues and keeps the frontend simple.
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helpful debug: log requests in dev/prod while you're fixing deploy issues
api.interceptors.request.use(
  (config) => {
    try {
      const method = (config.method || "GET").toUpperCase();
      const url = `${config.baseURL || ""}${config.url || ""}`;
      // NOTE: Axios may transform data later, but this is still useful
      console.log(`[api] ${method} ${url}`, config.data ?? "");
    } catch (_) {}
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
