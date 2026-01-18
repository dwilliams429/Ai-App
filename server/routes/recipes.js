// server/routes/recipes.js
const express = require("express");
const router = express.Router();

const { generateBetterRecipe } = require("../services/aiRecipe");

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function stripBullets(line) {
  return String(line || "").replace(/^\s*[-•]\s*/, "").trim();
}

function toTextFromRecipeStruct(recipe) {
  const title = recipe?.title || "Recipe";
  const meta = recipe?.meta || {};
  const timeMinutes = meta.timeMinutes ?? 30;
  const diet = meta.diet ?? "None";

  const ingredientsLines = asArray(recipe?.ingredients)
    .map((x) => stripBullets(x))
    .filter(Boolean);

  const stepsLines = asArray(recipe?.steps)
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  const ingredientsBlock =
    ingredientsLines.length > 0
      ? ingredientsLines.map((x) => `- ${x}`).join("\n")
      : "- (none)";

  const stepsBlock =
    stepsLines.length > 0
      ? stepsLines.map((s, i) => `${i + 1}. ${s}`).join("\n")
      : "1. (none)";

  return `${title}
Diet: ${diet}  •  Time: ${timeMinutes} min

Ingredients:
${ingredientsBlock}

Steps:
${stepsBlock}
`;
}

/**
 * POST /api/recipes/generate
 * Body: { ingredients: string[] | string, diet?: string, timeMinutes?: number, time?: number }
 *
 * Response:
 * { text: string, title: string, meta: {...}, recipe: {...}, usedAI: boolean, modelUsed?: string }
 */
router.post("/generate", async (req, res) => {
  try {
    const body = req.body || {};

    // Allow either array or comma string
    const ingredientsRaw = body.ingredients ?? "";
    const diet = String(body.diet || "None");
    const timeMinutes = Number(body.timeMinutes ?? body.time ?? 30) || 30;

    // generateBetterRecipe expects: { ingredients, pantry, diet, timeMinutes }
    const result = await generateBetterRecipe({
      ingredients: ingredientsRaw,
      pantry: [], // (optional) wire this later if you want
      diet,
      timeMinutes,
    });

    // result shape from your aiRecipe.js:
    // { recipe: {title, ingredients[], steps[], meta}, usedAI, modelUsed }
    const recipe = result?.recipe;

    // Build text for the client (this is what Home.jsx needs)
    const text = toTextFromRecipeStruct(recipe);

    if (typeof text !== "string" || !text.trim()) {
      return res.status(500).json({ error: "Invalid recipe response (no text)." });
    }

    return res.json({
      title: recipe?.title || "Recipe",
      text,
      meta: { diet, timeMinutes },
      recipe,
      usedAI: Boolean(result?.usedAI),
      modelUsed: result?.modelUsed || null,
    });
  } catch (err) {
    console.error("❌ /api/recipes/generate error:", err?.message || err);
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
