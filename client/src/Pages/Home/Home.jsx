import { useState } from "react";
import shell from "../PageShell.module.scss";
import styles from "./Home.module.scss";
import { generateRecipe } from "../../lib/api";

export default function Home() {
  const [ingredientsText, setIngredientsText] = useState("chicken, rice, broccoli");
  const [diet, setDiet] = useState("None");
  const [time, setTime] = useState(30);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState(null);

  async function onGenerate() {
    setError("");
    setRecipe(null);

    const ingredients = ingredientsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ingredients.length === 0) {
      setError("Please enter at least 1 ingredient.");
      return;
    }

    setLoading(true);
    try {
      const data = await generateRecipe({
        ingredients,
        diet,
        time: Number(time),
      });
      setRecipe(data);
    } catch (e) {
      setError(e.message || "Failed to generate recipe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={shell.card}>
      <h1 className={shell.title}>Featured Recipe</h1>
      <div className={shell.subtitle}>
        Generate a recipe automatically from your inventory + preferences.
      </div>

      <div className={shell.field}>
        <label className={shell.label}>Ingredients (comma separated)</label>
        <input
          className={shell.input}
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          placeholder="chicken, rice, broccoli"
        />
      </div>

      <div className={shell.field}>
        <label className={shell.label}>Diet</label>
        <select className={shell.select} value={diet} onChange={(e) => setDiet(e.target.value)}>
          <option>None</option>
          <option>Keto</option>
          <option>Gluten-Free</option>
          <option>Low Carb</option>
          <option>Vegetarian</option>
          <option>Vegan</option>
        </select>
      </div>

      <div className={shell.field}>
        <label className={shell.label}>Time (minutes)</label>
        <input
          className={shell.input}
          type="number"
          min="5"
          max="240"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <button className={shell.btn} onClick={onGenerate} disabled={loading}>
        {loading ? "Generating..." : "Generate"}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      {recipe && (
        <div className={styles.result}>
          <h3 className={styles.resultTitle}>{recipe.title || "Recipe"}</h3>

          {recipe.ingredients?.length ? (
            <>
              <h4>Ingredients</h4>
              <ul>
                {recipe.ingredients.map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </>
          ) : null}

          {recipe.steps?.length ? (
            <>
              <h4>Steps</h4>
              <ol>
                {recipe.steps.map((st, idx) => (
                  <li key={idx}>{st}</li>
                ))}
              </ol>
            </>
          ) : null}
        </div>
      )}

      {!recipe && !error && (
        <div className={shell.note}>
          Tip: once you connect Inventory, you can auto-fill ingredients from saved items.
        </div>
      )}
    </section>
  );
}
