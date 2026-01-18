// client/src/pages/RecipeDetail.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import ft from "../api/ft";

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [recipe, setRecipe] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setErr("");
      setBusy(true);
      try {
        const data = await ft.getRecipe(id);
        const r = data?.recipe || data; // supports either {recipe:{...}} or direct object
        if (!alive) return;
        setRecipe(r || null);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load recipe");
        setRecipe(null);
      } finally {
        if (!alive) return;
        setBusy(false);
      }
    }

    if (id) load();
    return () => {
      alive = false;
    };
  }, [id]);

  const title = recipe?.title || recipe?.name || "Recipe";
  const created = recipe?.createdAt ? new Date(recipe.createdAt).toLocaleString() : "";

  // Prefer saved .text (what your Home page shows)
  const text = recipe?.text || "";

  return (
    <GlassCard
      title={title}
      subtitle={created ? `Saved: ${created}` : "Recipe details"}
    >
      {err ? <div className="error-banner">⚠️ {err}</div> : null}

      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <button className="small-btn" type="button" onClick={() => navigate(q ? `/recipes?q=${encodeURIComponent(q)}` : "/recipes")}>
          ← Back to Recipes
        </button>

        <button className="small-btn" type="button" onClick={() => navigate("/")}>
          Home
        </button>
      </div>

      {busy ? (
        <div className="muted" style={{ marginTop: 14 }}>Loading…</div>
      ) : text ? (
        <pre style={{ marginTop: 14, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          {text}
        </pre>
      ) : (
        <div className="muted" style={{ marginTop: 14 }}>
          No text found for this recipe.
        </div>
      )}
    </GlassCard>
  );
}
