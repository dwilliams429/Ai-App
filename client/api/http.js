// client/src/api/http.js
import axios from "axios";

// IMPORTANT:
// Set this in Vercel (Production):
const BASE = "https://ai-app-8ale.onrender.com/api"
const origin = String(import.meta.env.VITE_API_URL || "https://ai-app-8ale.onrender.com/api").replace(/\/+$/, "");

const api = axios.create({
  baseURL: `${origin}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

console.log("[http] baseURL =", api.defaults.baseURL);

export default api;
