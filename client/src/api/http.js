// client/src/api/http.js
import axios from "axios";

/**
 * RULES (locked-in):
 * - In production: VITE_API_URL = https://ai-app-8ale.onrender.com
 *   → baseURL = https://ai-app-8ale.onrender.com/api
 *
 * - In local dev: VITE_API_URL is undefined
 *   → baseURL = "/api" (Vite proxy)
 *
 * - NEVER allow "/api/api"
 */

function normalizeBase(url) {
  if (!url) return "";

  // remove trailing slashes
  let clean = url.replace(/\/+$/, "");

  // if someone accidentally sets VITE_API_URL ending in /api, strip it
  if (clean.endsWith("/api")) {
    clean = clean.slice(0, -4);
  }

  return clean;
}

const raw = normalizeBase(import.meta.env.VITE_API_URL);

// final baseURL decision
const baseURL = raw ? `${raw}/api` : "/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
