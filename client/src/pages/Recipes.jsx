// client/src/pages/Recipes.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import ft from "../api/ft";

export default function Recipes() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();

  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const data = await ft.listRecipes();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.recipes) ? data.recipes : [];
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
  }, []);

  const filtered = useMemo(() => {
    if (!q) return items;
    const needle = q.toLowerCase();
    return items.filter((r) => {
      const title = String(r?.title || r?.name || "").toLowerCase();
      const text = String(r?.text || r?.recipe || r?.content || "").toLowerCase();
      return title.includes(needle) || text.includes(needle);
    });
  }, [items, q]);

  return (
    <GlassCard
      title="Recipes"
      subtitle={q ? `Showing results for “${q}” (click a recipe to open it).` : "Your saved recipes live here. Click a recipe to open it."}
    >
      {err ? <div className="error-banner">⚠️ {err}</div> : null}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
        <button className="small-btn" onClick={load} disabled={busy}>
          {busy ? "Loading..." : "Refresh"}
        </button>

        {q ? (
          <button className="small-btn" onClick={() => navigate("/recipes")} disabled={busy}>
            Clear Search
          </button>
        ) : null}

        <div className="muted" style={{ marginLeft: "auto" }}>
          {busy ? "" : `${filtered.length} recipe${filtered.length === 1 ? "" : "s"}`}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {!busy && filtered.length === 0 ? (
          <div className="muted">
            {q ? "No recipes matched your search." : "No saved recipes yet. Generate one on Home."}
          </div>
        ) : null}

        {filtered.map((r, idx) => {
          const id = r?._id || r?.id || "";
          const title = r?.title || r?.name || `Recipe ${idx + 1}`;
          const text = r?.text || r?.recipe || r?.content || "";
          const created = r?.createdAt ? new Date(r.createdAt).toLocaleString() : "";

          return (
            <button
              key={id || idx}
              type="button"
              className="list-card"
              style={{
                marginTop: 12,
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                border: "none",
              }}
              onClick={() => {
                if (!id) return;
                navigate(`/recipes/${id}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
              }}
              disabled={!id}
              title={id ? "Open recipe" : "Missing id"}
            >
              <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>

              {created ? <div className="muted" style={{ marginTop: 4 }}>{created}</div> : null}

              {text ? (
                <div className="muted" style={{ marginTop: 8 }}>
                  {String(text).slice(0, 180)}
                  {String(text).length > 180 ? "…" : ""}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}
