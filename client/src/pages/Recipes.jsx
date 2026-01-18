// client/src/pages/Recipes.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import ft from "../api/ft";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

export default function Recipes() {
  const q = useQuery().get("q") || "";
  const query = q.trim().toLowerCase();

  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null);

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const list = await ft.listRecipes();
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.message || "Failed to fetch recipes");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Auto-refresh when Home saves
  useEffect(() => {
    const onSaved = () => load();
    window.addEventListener("recipes:saved", onSaved);
    return () => window.removeEventListener("recipes:saved", onSaved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!query) return items;

    return items.filter((r) => {
      const title = String(r?.title || "").toLowerCase();
      const text = String(r?.text || "").toLowerCase();

      const ingredients = safeArray(r?.recipe?.ingredients).join(" ").toLowerCase();
      const steps = safeArray(r?.recipe?.steps).join(" ").toLowerCase();

      return (
        title.includes(query) ||
        text.includes(query) ||
        ingredients.includes(query) ||
        steps.includes(query)
      );
    });
  }, [items, query]);

  async function onDelete(id) {
    const ok = window.confirm("Delete this recipe?");
    if (!ok) return;

    // optimistic
    setItems((prev) => prev.filter((x) => (x?._id || x?.id) !== id));
    if (openId === id) setOpenId(null);

    try {
      await ft.deleteRecipe(id);
    } catch (e) {
      setErr(e?.message || "Delete failed");
      // reload to recover if needed
      load();
    }
  }

  async function onToggleFavorite(r) {
    const id = r?._id || r?.id;
    if (!id) return;

    const next = !Boolean(r?.favorite);

    // optimistic
    setItems((prev) =>
      prev.map((x) => ((x?._id || x?.id) === id ? { ...x, favorite: next } : x))
    );

    try {
      const updated = await ft.setFavorite(id, next);
      if (updated) {
        setItems((prev) =>
          prev.map((x) => ((x?._id || x?.id) === id ? updated : x))
        );
      }
    } catch (e) {
      setErr(e?.message || "Favorite update failed");
      load();
    }
  }

  return (
    <GlassCard
      title="Recipes"
      subtitle={query ? `Showing results for: "${q}"` : "Click a recipe to expand it inline."}
    >
      {err ? <div className="error-banner">⚠️ {err}</div> : null}

      <button className="small-btn" onClick={load} disabled={busy} style={{ marginTop: 10 }}>
        {busy ? "Loading..." : "Refresh"}
      </button>

      <div style={{ marginTop: 12 }}>
        {!busy && filtered.length === 0 ? (
          <div className="muted">
            {query ? "No matching recipes." : "No saved recipes yet. Generate one on Home."}
          </div>
        ) : null}

        {filtered.map((r, idx) => {
          const id = r?._id || r?.id || String(idx);
          const isOpen = openId === id;

          const title = r?.title || `Recipe ${idx + 1}`;
          const fav = Boolean(r?.favorite);

          const ingredients = safeArray(r?.recipe?.ingredients);
          const steps = safeArray(r?.recipe?.steps);

          return (
            <div key={id} className="list-card" style={{ marginTop: 12 }}>
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : id)}
                  className="pill-btn pill-btn--ghost"
                  style={{ padding: "8px 10px", flex: 1, textAlign: "left" }}
                >
                  <span style={{ fontWeight: 800 }}>{title}</span>
                  <span className="muted" style={{ marginLeft: 10 }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                <button
                  type="button"
                  className="pill-btn"
                  onClick={() => onToggleFavorite(r)}
                  title="Favorite"
                >
                  {fav ? "⭐" : "☆"}
                </button>

                <button
                  type="button"
                  className="pill-btn pill-btn--ghost"
                  onClick={() => onDelete(id)}
                  title="Delete"
                >
                  🗑
                </button>
              </div>

              {isOpen ? (
                <div style={{ marginTop: 12 }}>
                  {/* Structured UI first */}
                  {ingredients.length ? (
                    <>
                      <div style={{ fontWeight: 800, marginTop: 8 }}>Ingredients</div>
                      <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                        {ingredients.map((x, i) => (
                          <li key={i} style={{ marginTop: 4 }}>
                            {x}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {steps.length ? (
                    <>
                      <div style={{ fontWeight: 800, marginTop: 12 }}>Instructions</div>
                      <ol style={{ marginTop: 6, paddingLeft: 18 }}>
                        {steps.map((s, i) => (
                          <li key={i} style={{ marginTop: 6 }}>
                            {s}
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : null}

                  {/* Fallback to text if structured missing */}
                  {!ingredients.length && !steps.length && r?.text ? (
                    <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {r.text}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
