import React, { useEffect, useState } from "react";
import ft from "../api/ft";

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const data = await ft.listRecipes();
      setRecipes(data || []);
    } catch {
      setError("Failed to fetch recipes");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <h1>Recipes</h1>
      {error && <div className="error-banner">⚠️ {error}</div>}
      {recipes.length === 0 && <p>No saved recipes yet.</p>}
      <ul>
        {recipes.map(r => (
          <li key={r._id || r.title}>{r.title}</li>
        ))}
      </ul>
    </div>
  );
}
