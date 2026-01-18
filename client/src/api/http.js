// client/src/api/http.js
import axios from "axios";

/**
 * Production:
 *   VITE_API_URL = https://ai-app-8ale.onrender.com
 *
 * Local dev:
 *   VITE_API_URL can be empty → Vite proxy handles /api
 */
const baseURL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error(
      "[api] error:",
      err?.response?.status,
      err?.response?.data || err?.message
    );
    return Promise.reject(err);
  }
);

export default api;
