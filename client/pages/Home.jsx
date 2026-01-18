// client/src/pages/Home.jsx
import React, { useState } from "react";
import GlassCard from "../components/GlassCard";
import ft from "../api/ft";

export default function Home() {
  const [ingredients, setIngredients] = useState("chicken, rice, broccoli");
  const [diet, setDiet] = useState("None");
  const [timeMinutes, setTimeMinutes] = useState(30);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [recipeText, setRecipeText] = useState("");

  async function onGenerate() {
    setErr("");
    setRecipeText("");

    const cleaned = ingredients
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (cleaned.length === 0) {
      setErr("Please enter at least 1 ingredient.");
      return;
    }

    setBusy(true);
    try {
      const data = await ft.generateRecipe({
        ingredients: cleaned,
        diet,
        timeMinutes: Number(timeMinutes) || 30,
      });

      // ✅ SINGLE SOURCE OF TRUTH
      if (!data || typeof data.text !== "string") {
        throw new Error("Invalid recipe response from server (expected { text: string }).");
      }

      setRecipeText(data.text);
    } catch (e) {
      setErr(e.message || "Failed to generate recipe");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard
      title="Featured Recipe"
      subtitle="Generate a better recipe from your ingredients + your saved inventory."
    >
      {err && <div className="error-banner">⚠️ {err}</div>}

      <div className="field">
        <div className="field__label">Ingredients (comma separated)</div>
        <input
          className="field__input"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <label className="field" style={{ flex: 1 }}>
          <span className="field__label">Diet</span>
          <select
            className="field__input"
            value={diet}
            onChange={(e) => setDiet(e.target.value)}
          >
            <option>None</option>
            <option>Vegetarian</option>
            <option>Vegan</option>
            <option>Keto</option>
            <option>Gluten-Free</option>
          </select>
        </label>

        <label className="field" style={{ width: 180 }}>
          <span className="field__label">Time (minutes)</span>
          <input
            className="field__input"
            type="number"
            value={timeMinutes}
            onChange={(e) => setTimeMinutes(e.target.value)}
          />
        </label>
      </div>

      <button
        className="big-btn"
        style={{ marginTop: 14 }}
        disabled={busy}
        onClick={onGenerate}
      >
        {busy ? "Generating..." : "Generate"}
      </button>

      {recipeText && (
        <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
          {recipeText}
        </pre>
      )}
    </GlassCard>
  );
}
