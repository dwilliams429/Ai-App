// client/api/http.js
import axios from "axios";

// In production, call Render directly.
// In dev, call your local server.
const API_ORIGIN = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL // e.g. "https://ai-app-8ale.onrender.com"
  : (import.meta.env.VITE_API_URL || "http://localhost:5050");

// Safety: remove trailing slash
const origin = String(API_ORIGIN || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: `${origin}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Debug logging (keep while deploying; remove later)
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
