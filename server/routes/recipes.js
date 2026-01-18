// server/routes/recipes.js
const express = require("express");
const router = express.Router();

/**
 * POST /api/recipes/generate
 * Must return { text: string }
 */
router.post("/generate", async (req, res) => {
  try {
    const body = req.body || {};
    const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
    const diet = body.diet || "None";
    const timeMinutes = Number(body.timeMinutes ?? 30) || 30;

    if (!ingredients.length) {
      return res.status(400).json({ error: "ingredients must be a non-empty array" });
    }

    const main = String(ingredients[0] || "Recipe").trim() || "Recipe";
    const title = `${diet !== "None" ? `${diet} ` : ""}${main} Recipe`;

    const steps = [
      `Prep ingredients (target ${timeMinutes} min).`,
      "Cook main ingredient until done.",
      "Add remaining ingredients and season to taste.",
      "Serve and enjoy.",
    ];

    const text = `${title}

Ingredients:
- ${ingredients.join("\n- ")}

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

/**
 * GET /api/recipes
 */
router.get("/", async (req, res) => {
  return res.json({ recipes: [] });
});

module.exports = router;
