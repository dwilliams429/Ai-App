// client/src/api/http.js
import axios from "axios";

/**
 * In Vercel:
 *   VITE_API_URL = https://ai-app-8ale.onrender.com
 *
 * Locally:
 *   leave blank and use Vite proxy "/api"
 */
const baseURL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url || "";

    if (status === 401 && url.includes("/auth/me")) {
      return Promise.reject(err);
    }

    console.error("[api] error:", status, err?.response?.data || err?.message);
    return Promise.reject(err);
  }
);

export default api;
