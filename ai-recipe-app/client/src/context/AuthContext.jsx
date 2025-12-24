import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/http";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function boot() {
      try {
        const me = await api.me();
        if (alive) setUser(me || null);
      } catch (e) {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    boot();
    return () => {
      alive = false;
    };
  }, []);

  async function login(emailOrPayload, password) {
    const payload =
      typeof emailOrPayload === "object" && emailOrPayload !== null
        ? emailOrPayload
        : { email: emailOrPayload, password };

    const me = await api.login(payload);
    setUser(me || null);
    return me;
  }

  async function signup(payload) {
    const me = await api.signup(payload || {});
    setUser(me || null);
    return me;
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      login,
      signup,
      logout
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error("useAuth() must be used inside <AuthProvider>");
  return ctx;
}
