// server/routes/recipes.js
const express = require("express");
const router = express.Router();

/**
 * Mounted in server.js like:
 *   app.use("/api/recipes", recipesRoutes);
 *
 * So this endpoint becomes:
 *   POST /api/recipes/generate
 *
 * ✅ Always returns: { title: string, text: string, meta: {...} }
 */
router.post("/generate", async (req, res) => {
  try {
    const body = req.body || {};

    const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
    const diet = body.diet || "None";

    // support either timeMinutes or time
    const timeMinutes = Number(body.timeMinutes ?? body.time ?? 30) || 30;

    if (!ingredients.length) {
      return res.status(400).json({ error: "ingredients must be a non-empty array" });
    }

    const main = String(ingredients[0] || "Recipe").trim() || "Recipe";
    const title = `${diet !== "None" ? `${diet} ` : ""}${main} Bowl`;

    const steps = [
      `Prep ingredients (target ${timeMinutes} min total).`,
      "Heat pan, add oil, cook main protein/veg until done.",
      "Combine remaining ingredients, season to taste.",
      "Serve warm.",
    ];

    const text = `${title}

Ingredients:
${ingredients.join(", ")}

Steps:
${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}
`;

    return res.json({
      title,
      text,
      meta: { diet, timeMinutes },
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

// Optional: GET /api/recipes
router.get("/", async (req, res) => {
  try {
    return res.json({ recipes: [] });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

module.exports = router;
