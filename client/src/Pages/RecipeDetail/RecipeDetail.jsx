import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import shell from "../PageShell.module.scss";
import styles from "./RecipeDetail.module.scss";
import { getRecipe } from "../../lib/api";

export default function RecipeDetail() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const data = await getRecipe(id);
        if (!alive) return;
        setRecipe(data.recipe);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load recipe.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className={shell.page}>
      <section className={shell.card}>
        {loading ? <div className={styles.muted}>Loading…</div> : null}
        {error ? <div className={shell.error}>{error}</div> : null}

        {recipe ? (
          <>
            <h1 className={styles.h1}>{recipe.title}</h1>
            <p className={styles.sub}>{recipe.description}</p>

            <div className={styles.columns}>
              <div className={styles.panel}>
                <h3 className={styles.h3}>Ingredients</h3>
                <ul className={styles.list}>
                  {(recipe.ingredients || []).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.panel}>
                <h3 className={styles.h3}>Steps</h3>
                <ol className={styles.list}>
                  {(recipe.steps || []).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ol>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
