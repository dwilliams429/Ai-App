import React, { useState } from "react";
import ft from "../api/ft";

export default function Home() {
  const [ingredients, setIngredients] = useState("");
  const [diet, setDiet] = useState("None");
  const [time, setTime] = useState(30);
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState(null);

  async function onGenerate() {
    setError("");
    try {
      const data = await ft.generateRecipe({
        ingredients: ingredients.split(",").map(s => s.trim()),
        diet,
        time,
      });
      setRecipe(data);
    } catch (e) {
      setError(e.message || "Failed to generate recipe");
    }
  }

  return (
    <div className="page">
      <h1>Featured Recipe</h1>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <input
        value={ingredients}
        onChange={e => setIngredients(e.target.value)}
        placeholder="chicken, rice, broccoli"
      />

      <select value={diet} onChange={e => setDiet(e.target.value)}>
        <option>None</option>
        <option>Vegetarian</option>
        <option>Vegan</option>
      </select>

      <input
        type="number"
        value={time}
        onChange={e => setTime(Number(e.target.value))}
      />

      <button onClick={onGenerate}>Generate</button>

      {recipe && (
        <pre>{JSON.stringify(recipe, null, 2)}</pre>
      )}
    </div>
  );
}
