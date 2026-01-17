// client/src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/http";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  // Fetch current session user (safe to call on load)
  async function refreshMe() {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data?.user || null);
      setAuthError("");
      return res.data;
    } catch (err) {
      // Expected before login
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  // ✅ Accepts an object payload (matches your Login/Signup pages)
  async function signup({ name, email, password }) {
    setAuthError("");

    const safeName = (name ?? "").trim();
    const safeEmail = (email ?? "").trim();
    const safePassword = password ?? "";

    try {
      const res = await api.post("/auth/signup", {
        name: safeName,
        email: safeEmail,
        password: safePassword,
      });

      await refreshMe();
      return res.data;
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Signup failed";
      setAuthError(msg);
      throw new Error(msg);
    }
  }

  // ✅ Accepts an object payload (matches Login.jsx calling login({ email, password }))
  async function login({ email, password }) {
    setAuthError("");

    const safeEmail = (email ?? "").trim();
    const safePassword = password ?? "";

    try {
      const res = await api.post("/auth/login", {
        email: safeEmail,
        password: safePassword,
      });

      await refreshMe();
      return res.data;
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Login failed";
      setAuthError(msg);
      throw new Error(msg);
    }
  }

  async function logout() {
    setAuthError("");
    try {
      await api.post("/auth/logout");
    } catch (err) {
      // Even if logout fails, clear local user so UI updates
      console.warn("Logout error:", err?.message || err);
    } finally {
      setUser(null);
    }
  }

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      refreshMe,
      signup,
      login,
      logout,
      setUser,
    }),
    [user, loading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
