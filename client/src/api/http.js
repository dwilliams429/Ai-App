// client/src/api/http.js
import axios from "axios";

/**
 * If VITE_API_URL is set (deployed), we use that full origin as the base.
 * Example: VITE_API_URL = https://ai-app-8ale.onrender.com
 *
 * Then ft.js calls "/recipes" and "/inventory" etc.
 * No "/api/api" duplication. No guessing.
 */

function normalizeBase(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

const baseURL = normalizeBase(import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: baseURL || "", // if blank, works with same-origin or Vite proxy
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export default api;
