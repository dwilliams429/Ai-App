import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState("Demo User 1");
  const [email, setEmail] = useState("demo1@demo.com");
  const [password, setPassword] = useState("Demo123456!");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!name.trim()) return setErr("Name is required");
    if (!email.includes("@")) return setErr("Enter a valid email");
    if (!password) return setErr("Password is required");

    setBusy(true);
    try {
      await signup({ name, email, password });
      nav("/");
    } catch (e2) {
      setErr(e2.message || "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard title="Create account" subtitle="Sign up uses secure sessions + cookies.">
      <form onSubmit={onSubmit} className="auth-form">
        <label className="field">
          <span className="field__label">Name</span>
          <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="field">
          <span className="field__label">Email</span>
          <input className="field__input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="field__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {err ? <div className="error-banner">⚠️ {err}</div> : null}

        <button className="big-btn" disabled={busy} type="submit">
          {busy ? "Creating..." : "Sign Up"}
        </button>

        <div className="muted" style={{ marginTop: 12 }}>
          Have an account? <Link to="/login">Login</Link>
        </div>
      </form>
    </GlassCard>
  );
}
