import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../src/api/http";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  async function refreshMe() {
    try {
      const res = await api.me();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signup(payload) {
    setAuthError("");
    try {
      await api.signup(payload);
      await refreshMe();
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  }

  async function login(payload) {
    setAuthError("");
    try {
      await api.login(payload);
      await refreshMe();
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  useEffect(() => {
    refreshMe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, authError, signup, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
