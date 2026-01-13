// client/src/api/http.js
import axios from "axios";

// Vercel env var MUST be:
// VITE_API_URL = "https://ai-app-8ale.onrender.com"   (NO /api, NO "VITE_API_URL=" prefix)
const ORIGIN =
  (import.meta?.env?.VITE_API_URL && String(import.meta.env.VITE_API_URL)) ||
  "http://localhost:5050";

// Safety: remove trailing slash
const origin = ORIGIN.replace(/\/+$/, "");

// IMPORTANT:
// - baseURL ends with /api
// - withCredentials must be true for cookie sessions
const api = axios.create({
  baseURL: `${origin}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Optional but helpful while debugging:
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

export { default } from "../src/api/http";
