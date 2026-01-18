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
      // ft.listRecipes() returns an ARRAY (see client/src/api/ft.js)
      const arr = await ft.listRecipes();
      setItems(Array.isArray(arr) ? arr : []);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Failed to fetch");
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
        {!busy && items.length === 0 ? (
          <div className="muted">No saved recipes yet. Generate one on Home.</div>
        ) : null}

        {items.map((r, idx) => {
          const title = r?.title || r?.name || `Recipe ${idx + 1}`;

          // Your server model uses `text` as the pretty formatted recipe.
          // Keep a couple fallbacks just in case.
          const body =
            r?.text ||
            (typeof r?.recipe === "string" ? r.recipe : "") ||
            r?.content ||
            "";

          return (
            <div key={r?._id || r?.id || idx} className="list-card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700 }}>{title}</div>
              {body ? (
                <div className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
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
