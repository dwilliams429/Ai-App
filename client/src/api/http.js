// client/src/api/http.js
import axios from "axios";

// Frontend should call SAME-ORIGIN /api
// Vercel will route /api -> your server (Render) via your rewrite/proxy setup.
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export default api;
