// client/src/pages/Recipes.jsx
import React, { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/GlassCard";
import ft from "../api/ft";

function formatDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

export default function Recipes() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  async function load({ keepSelection = true } = {}) {
    setErr("");
    setBusy(true);
    try {
      const arr = await ft.listRecipes(); // ft already returns array
      setItems(arr);

      if (!keepSelection) {
        setSelectedId(arr?.[0]?._id || null);
      } else {
        // if selection no longer exists, pick first
        const stillExists = arr.some((r) => r?._id === selectedId);
        if (!stillExists) setSelectedId(arr?.[0]?._id || null);
      }
    } catch (e) {
      setErr(e?.message || "Failed to fetch");
      setItems([]);
      setSelectedId(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load({ keepSelection: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh when Home saves a recipe (storage event)
  useEffect(() => {
    function onStorage(e) {
      if (e.key === "recipes:lastSavedAt") {
        load({ keepSelection: false });
      }
    }
    window.addEventListener("storage", onStorage);

    // also handle same-tab updates (storage event doesn't fire in same tab)
    const poll = setInterval(() => {
      const v = localStorage.getItem("recipes:lastSavedAt");
      // if present and changed, reload
      if (v && v !== onStorage._last) {
        onStorage._last = v;
        load({ keepSelection: false });
      }
    }, 1500);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((r) => {
      const title = String(r?.title || "").toLowerCase();
      const text = String(r?.text || "").toLowerCase();
      return title.includes(needle) || text.includes(needle);
    });
  }, [items, q]);

  const selected = useMemo(() => {
    return filtered.find((r) => r?._id === selectedId) || filtered[0] || null;
  }, [filtered, selectedId]);

  return (
    <GlassCard title="Recipes" subtitle="Saved recipes from Home (stored in MongoDB).">
      {err ? <div className="error-banner">⚠️ {err}</div> : null}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
        <button className="small-btn" onClick={() => load({ keepSelection: true })} disabled={busy}>
          {busy ? "Loading..." : "Refresh"}
        </button>

        <input
          className="field__input"
          style={{ maxWidth: 380 }}
          placeholder="Search saved recipes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14, marginTop: 14 }}>
        {/* LEFT: list */}
        <div>
          {!busy && filtered.length === 0 ? (
            <div className="muted">No recipes match your search.</div>
          ) : null}

          {filtered.map((r) => {
            const id = r?._id;
            const active = id && id === (selected?._id || null);
            const title = r?.title || "Recipe";
            const when = r?.createdAt ? formatDate(r.createdAt) : "";

            return (
              <button
                key={id || title}
                onClick={() => setSelectedId(id)}
                className="list-card"
                style={{
                  width: "100%",
                  textAlign: "left",
                  marginTop: 10,
                  cursor: "pointer",
                  border: active ? "1px solid rgba(255,255,255,0.35)" : "1px solid transparent",
                  background: active ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontWeight: 800 }}>{title}</div>
                {when ? <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{when}</div> : null}
              </button>
            );
          })}
        </div>

        {/* RIGHT: details */}
        <div className="list-card" style={{ minHeight: 220 }}>
          {!selected ? (
            <div className="muted">Select a recipe to view details.</div>
          ) : (
            <>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{selected.title || "Recipe"}</div>
              {selected.createdAt ? (
                <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                  {formatDate(selected.createdAt)}
                </div>
              ) : null}

              {selected.text ? (
                <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {selected.text}
                </pre>
              ) : (
                <div className="muted" style={{ marginTop: 12 }}>
                  No recipe text stored.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
