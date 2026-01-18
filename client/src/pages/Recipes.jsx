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
      const data = await ft.listRecipes();
      const arr = Array.isArray(data?.recipes) ? data.recipes : [];
      setItems(arr);
    } catch (e) {
      setErr(e?.message || "Failed to fetch");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();

    // ✅ Auto-refresh when Home saves (storage event fires across tabs/windows)
    function onStorage(e) {
      if (e.key === "recipes:lastSavedAt") load();
    }

    // ✅ Also refresh when user returns to this tab
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <GlassCard title="Recipes" subtitle="Saved recipes from Home (stored in MongoDB).">
      {err ? <div className="error-banner">⚠️ {err}</div> : null}

      <button className="small-btn" onClick={load} disabled={busy} style={{ marginTop: 10 }}>
        {busy ? "Loading..." : "Refresh"}
      </button>

      <div style={{ marginTop: 12 }}>
        {!busy && items.length === 0 ? (
          <div className="muted">No saved recipes yet. Generate one on Home.</div>
        ) : null}

        {items.map((r, idx) => {
          const title = r?.title || `Recipe ${idx + 1}`;
          const body = r?.text || "";
          const when = r?.createdAt ? new Date(r.createdAt).toLocaleString() : "";

          return (
            <div key={r?._id || idx} className="list-card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700 }}>{title}</div>
              {when ? <div className="muted" style={{ marginTop: 4 }}>{when}</div> : null}
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
