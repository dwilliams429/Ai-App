// client/src/pages/Recipes.jsx
import React, { useEffect, useState } from "react";
import GlassCard from "../components/GlassCard";
import ft from "../api/ft";

export default function Recipes() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const arr = await ft.listRecipes(); // ✅ now returns array
      setItems(Array.isArray(arr) ? arr : []);
    } catch (e) {
      setErr(e?.message || "Failed to fetch");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <GlassCard title="Recipes" subtitle="Your saved recipes live here. Generate recipes on Home.">
      {err ? <div className="error-banner">⚠️ {err}</div> : null}

      <button className="small-btn" onClick={load} disabled={busy} style={{ marginTop: 10 }}>
        {busy ? "Loading..." : "Refresh"}
      </button>

      <div style={{ marginTop: 12 }}>
        {!busy && items.length === 0 ? <div className="muted">No saved recipes yet. Generate one on Home.</div> : null}

        {items.map((r, idx) => {
          const title = r?.title || `Recipe ${idx + 1}`;
          const body = r?.text || "";
          return (
            <div key={r?._id || idx} className="list-card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700 }}>{title}</div>
              {r?.meta ? (
                <div className="muted" style={{ marginTop: 4 }}>
                  Diet: {r.meta.diet || "None"} • Time: {r.meta.timeMinutes || 30} min
                </div>
              ) : null}
              {body ? (
                <div className="muted" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                  {body}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
