// client/src/pages/Home.jsx
import React, { useState } from "react";
import GlassCard from "../components/GlassCard";
import ft from "../api/ft";

// --- Helpers to compare ingredient lines vs inventory names ---
function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // remove parentheticals
    .replace(/[^a-z0-9\s-]/g, " ") // remove punctuation
    .replace(/\s+/g, " ")
    .trim();
}

// Convert "2 tbsp peanut butter" -> "peanut butter"
function coreNameFromIngredientLine(line) {
  let s = String(line || "").trim();
  if (!s) return "";

  // remove leading bullets
  s = s.replace(/^\s*[-•]\s*/, "").trim();

  // remove common leading quantities/units (best-effort)
  // examples: "1/2", "2", "1–2", "6-8", "1 1/2"
  s = s.replace(
    /^(\d+(\.\d+)?|\d+\s+\d\/\d|\d\/\d|\d+\s*[-–]\s*\d+)\s*/i,
    ""
  ).trim();

  // remove common units right after quantity
  s = s.replace(
    /^(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|ml|l|liter|liters|slice|slices|clove|cloves|can|cans|block|blocks|serving|servings)\b\s*/i,
    ""
  ).trim();

  // handle patterns like "protein (about 6–8 oz raw meat OR ...)"
  // keep first meaningful phrase before "("
  s = s.split("(")[0].trim();

  // keep first phrase before comma (often "banana, sliced")
  s = s.split(",")[0].trim();

  return normalizeName(s);
}

function isIgnoreStaple(core) {
  // Don’t auto-add these staples
  const ignore = new Set([
    "salt",
    "pepper",
    "black pepper",
    "water",
    "olive oil",
    "oil",
  ]);
  return ignore.has(core);
}

export default function Home() {
  const [ingredients, setIngredients] = useState("chicken, rice, broccoli");
  const [diet, setDiet] = useState("None");
  const [timeMinutes, setTimeMinutes] = useState(30);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [recipeText, setRecipeText] = useState("");
  const [savedId, setSavedId] = useState("");
  const [shoppingAdded, setShoppingAdded] = useState([]); // show what was added

  async function onGenerate() {
    setErr("");
    setRecipeText("");
    setSavedId("");
    setShoppingAdded([]);

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
      // 1) Generate + save recipe (server saves)
      const data = await ft.generateRecipe({
        ingredients: cleaned,
        diet,
        timeMinutes: Number(timeMinutes) || 30,
      });

      if (!data || typeof data.text !== "string") {
        throw new Error("Invalid recipe response from server (expected { text: string }).");
      }

      setRecipeText(data.text);

      const id = data?.saved?._id || "";
      if (id) setSavedId(id);

      // ✅ notify Recipes page to reload
      localStorage.setItem("recipes:lastSavedAt", String(Date.now()));
      window.dispatchEvent(new Event("recipes:saved"));

      // 2) Auto-add missing ingredients to Shopping List
      //    - Use structured ingredients if available
      const recipeIngredients = Array.isArray(data?.recipe?.ingredients)
        ? data.recipe.ingredients
        : [];

      // If no structured list, don’t attempt auto-add (keeps safe)
      if (recipeIngredients.length) {
        const inv = await ft.listInventory(); // expects array of items with name
        const inventoryNames = new Set(
          (Array.isArray(inv) ? inv : [])
            .map((x) => normalizeName(x?.name || x?.item || ""))
            .filter(Boolean)
        );

        // derive missing by comparing cores
        const missingCores = [];
        const missingPretty = [];

        for (const line of recipeIngredients) {
          const core = coreNameFromIngredientLine(line);
          if (!core) continue;
          if (isIgnoreStaple(core)) continue;

          // if any inventory item contains the core (or vice versa), treat as present
          const hasSoftMatch = Array.from(inventoryNames).some(
            (n) => n.includes(core) || core.includes(n)
          );
          if (hasSoftMatch) continue;

          if (!missingCores.includes(core)) {
            missingCores.push(core);
            // show user-friendly name (use original line core-ish)
            missingPretty.push(core);
          }
        }

        // add to shopping list
        if (missingPretty.length) {
          for (const name of missingPretty) {
            // qty optional: leave blank
            await ft.addShopping({ name });
          }
          setShoppingAdded(missingPretty);
        }
      }
    } catch (e) {
      setErr(e?.message || "Failed to generate recipe");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard
      title="Featured Recipe"
      subtitle="Generate a recipe from your ingredients. It auto-saves to Recipes and can auto-add missing items to Shopping List."
    >
      {err ? <div className="error-banner">⚠️ {err}</div> : null}

      <div className="field" style={{ marginTop: 10 }}>
        <div className="field__label">Ingredients (comma separated)</div>
        <input
          className="field__input"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <label className="field" style={{ flex: 1, minWidth: 220 }}>
          <span className="field__label">Diet</span>
          <select className="field__input" value={diet} onChange={(e) => setDiet(e.target.value)}>
            <option>None</option>
            <option>Vegetarian</option>
            <option>Vegan</option>
            <option>Keto</option>
            <option>Gluten-Free</option>
          </select>
        </label>

        <label className="field" style={{ width: 220 }}>
          <span className="field__label">Time (minutes)</span>
          <input
            className="field__input"
            type="number"
            value={timeMinutes}
            onChange={(e) => setTimeMinutes(e.target.value)}
          />
        </label>
      </div>

      <button className="big-btn" style={{ marginTop: 14 }} disabled={busy} onClick={onGenerate}>
        {busy ? "Generating..." : "Generate"}
      </button>

      {savedId ? <div className="muted" style={{ marginTop: 10 }}>Saved ✅</div> : null}

      {shoppingAdded.length ? (
        <div className="muted" style={{ marginTop: 10 }}>
          Added to Shopping List: <strong>{shoppingAdded.join(", ")}</strong>
        </div>
      ) : null}

      {recipeText ? (
        <pre style={{ marginTop: 16, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {recipeText}
        </pre>
      ) : null}
    </GlassCard>
  );
}
