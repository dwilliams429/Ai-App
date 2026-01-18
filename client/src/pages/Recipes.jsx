// client/src/pages/Recipes.jsx
import React, { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/GlassCard";
import ft from "../api/ft";

export default function Recipes() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  async function load() {
    setErr("");
    setBusy(true);
    try {
      // ft.listRecipes returns { recipes: [...] }
      const data = await ft.listRecipes();
      const arr = Array.isArray(data?.recipes) ? data.recipes : [];
      setItems(arr);

      // Keep selection if possible, otherwise select first item
      if (arr.length) {
        const stillExists = selectedId && arr.some((r) => String(r?._id) === String(selectedId));
        setSelectedId(stillExists ? selectedId : String(arr[0]?._id || ""));
      } else {
        setSelectedId(null);
      }
    } catch (e) {
      setErr(e?.message || "Failed to fetch");
      setItems([]);
      setSelectedId(null);
    } finally {
      setBusy(false);
    }
  }

  // Initial load
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh when Home saves a recipe:
  // Home will set localStorage key "recipes:lastSavedAt" to Date.now()
  useEffect(() => {
    function onStorage(e) {
      if (e.key === "recipes:lastSavedAt") load();
    }
    window.addEventListener("storage", onStorage);

    // Also handle same-tab updates (storage event doesn't fire in same tab),
    // so we poll a tiny key read on focus.
    function onFocus() {
      const ts = Number(localStorage.getItem("recipes:lastSavedAt") || 0);
      if (ts) load();
    }
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      const title = String(r?.title || "").toLowerCase();
      const text = String(r?.text || "").toLowerCase();
      return title.includes(q) || text.includes(q);
    });
  }, [items, query]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return filtered.find((r) => String(r?._id) === String(selectedId)) || null;
  }, [filtered, selectedId]);

  function formatDate(d) {
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "";
    }
  }

  return (
    <GlassCard title="Recipes" subtitle="Saved recipes from Home (stored in MongoDB).">
      {err ? <div className="error-banner">⚠️ {err}</div> : null}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
        <button className="small-btn" onClick={load} disabled={busy}>
          {busy ? "Loading..." : "Refresh"}
        </button>

        <input
          className="field__input"
          style={{ maxWidth: 360 }}
          placeholder="Search title or ingredients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!busy && filtered.length === 0 ? (
        <div className="muted" style={{ marginTop: 12 }}>
          No saved recipes yet. Generate one on Home.
        </div>
      ) : null}

      {/* Two-column layout on desktop, stacks on mobile */}
      <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
        {/* LIST */}
        <div style={{ flex: 1, minWidth: 280 }}>
          {filtered.map((r, idx) => {
            const id = String(r?._id || idx);
            const title = r?.title || `Recipe ${idx + 1}`;
            const when = r?.createdAt ? formatDate(r.createdAt) : "";
            const isActive = String(selectedId) === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedId(id)}
                className="list-card"
                style={{
                  marginTop: 10,
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  border: isActive ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.12)",
                  background: isActive ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontWeight: 800 }}>{title}</div>
                {when ? <div className="muted" style={{ marginTop: 2 }}>{when}</div> : null}
              </button>
            );
          })}
        </div>

        {/* DETAIL */}
        <div style={{ flex: 2, minWidth: 300 }}>
          {selected ? (
            <div className="list-card" style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{selected.title}</div>
              {selected.createdAt ? (
                <div className="muted" style={{ marginTop: 4 }}>
                  {formatDate(selected.createdAt)}
                </div>
              ) : null}

              {selected.text ? (
                <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                  {selected.text}
                </pre>
              ) : (
                <div className="muted" style={{ marginTop: 10 }}>
                  No recipe text available.
                </div>
              )}
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 10 }}>
              Select a recipe to view it.
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
