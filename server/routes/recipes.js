// server/routes/recipes.js
"use strict";

const express = require("express");
const router = express.Router();

const Recipe = require("../models/Recipe");
const { generateBetterRecipe } = require("../services/aiRecipe");

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function toTextFromRecipeStruct(recipe) {
  const title = recipe?.title || "Recipe";
  const meta = recipe?.meta || {};
  const timeMinutes = meta.timeMinutes ?? 30;
  const diet = meta.diet ?? "None";

  const ingredientsLines = asArray(recipe?.ingredients)
    .map((x) => String(x || "").trim())
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
 * POST /recipes/generate and /api/recipes/generate (because you mount both)
 * Body: { ingredients: string[] | string, diet?: string, timeMinutes?: number, time?: number }
 *
 * Response:
 * { text, title, meta, recipe, usedAI, modelUsed }
 */
router.post("/generate", async (req, res) => {
  try {
    const body = req.body || {};
    const ingredientsRaw = body.ingredients ?? "";
    const diet = String(body.diet || "None");
    const timeMinutes = Number(body.timeMinutes ?? body.time ?? 30) || 30;

    const result = await generateBetterRecipe({
      ingredients: ingredientsRaw,
      pantry: [],
      diet,
      timeMinutes,
    });

    const recipe = result?.recipe;
    const text = toTextFromRecipeStruct(recipe);

    if (typeof text !== "string" || !text.trim()) {
      return res.status(500).json({ error: "Invalid recipe response (no text)." });
    }

    // optional userId capture (won't break if you don't have auth)
    const userId =
      req.session?.userId ||
      req.session?.user?.id ||
      req.session?.user?._id ||
      null;

    // Save to MongoDB so Recipes page can actually show them
    const saved = await Recipe.create({
      userId,
      title: recipe?.title || "Recipe",
      text,
      ingredients: asArray(recipe?.ingredients).map(String),
      steps: asArray(recipe?.steps).map(String),
      meta: { diet, timeMinutes, type: recipe?.meta?.type || null },
      usedAI: Boolean(result?.usedAI),
      modelUsed: result?.modelUsed || null,
    });

    return res.json({
      title: saved.title,
      text: saved.text,
      meta: saved.meta,
      recipe: {
        title: saved.title,
        ingredients: saved.ingredients,
        steps: saved.steps,
        meta: saved.meta,
      },
      usedAI: saved.usedAI,
      modelUsed: saved.modelUsed,
      id: saved._id,
      createdAt: saved.createdAt,
    });
  } catch (err) {
    console.error("❌ /recipes/generate error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

/**
 * GET /recipes and /api/recipes
 * Returns: { recipes: Recipe[] }
 */
router.get("/", async (req, res) => {
  try {
    const userId =
      req.session?.userId ||
      req.session?.user?.id ||
      req.session?.user?._id ||
      null;

    const limit = Math.min(Number(req.query.limit || 50) || 50, 200);

    // If you have users, show only their recipes; otherwise show all
    const filter = userId ? { userId } : {};

    const recipes = await Recipe.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ recipes });
  } catch (err) {
    console.error("❌ /recipes GET error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

module.exports = router;
