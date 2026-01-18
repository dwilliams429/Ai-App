// server/routes/recipes.js
"use strict";

const express = require("express");
const router = express.Router();

const Recipe = require("../models/Recipe");
const { generateBetterRecipe } = require("../services/aiRecipe");

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function normalizeSteps(steps) {
  // prevent "1. 1. Step" if a model includes numbering
  return asArray(steps)
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .map((s) => s.replace(/^\s*\d+\.\s+/, "").trim());
}

function toTextFromRecipeStruct(recipe) {
  const title = recipe?.title || "Recipe";
  const meta = recipe?.meta || {};
  const timeMinutes = meta.timeMinutes ?? 30;
  const diet = meta.diet ?? "None";

  const ingredientsLines = asArray(recipe?.ingredients)
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  const stepsLines = normalizeSteps(recipe?.steps);

  const ingredientsBlock =
    ingredientsLines.length > 0 ? ingredientsLines.map((x) => `- ${x}`).join("\n") : "- (none)";

  const stepsBlock =
    stepsLines.length > 0 ? stepsLines.map((s, i) => `${i + 1}. ${s}`).join("\n") : "1. (none)";

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
 * Saves the generated recipe to MongoDB and returns it.
 */
router.post("/generate", async (req, res) => {
  try {
    const body = req.body || {};

    // Allow either array or comma string
    const ingredientsRaw = body.ingredients ?? "";
    const diet = String(body.diet || "None");
    const timeMinutes = Number(body.timeMinutes ?? body.time ?? 30) || 30;

    // Optional: attach to logged-in user if you store it on session
    const userId = req?.session?.userId ? String(req.session.userId) : null;

    const result = await generateBetterRecipe({
      ingredients: ingredientsRaw,
      pantry: [],
      diet,
      timeMinutes
    });

    const recipe = result?.recipe;
    if (!recipe || typeof recipe !== "object") {
      return res.status(500).json({ error: "Invalid recipe response (no recipe object)." });
    }

    const text = toTextFromRecipeStruct(recipe);
    if (!text.trim()) {
      return res.status(500).json({ error: "Invalid recipe response (no text)." });
    }

    const saved = await Recipe.create({
      userId,
      title: recipe?.title || "Recipe",
      text,
      recipe,
      meta: { diet, timeMinutes },
      usedAI: Boolean(result?.usedAI),
      modelUsed: result?.modelUsed || null
    });

    return res.json({
      id: saved._id,
      title: saved.title,
      text: saved.text,
      meta: saved.meta,
      recipe: saved.recipe,
      usedAI: saved.usedAI,
      modelUsed: saved.modelUsed
    });
  } catch (err) {
    console.error("❌ /api/recipes/generate error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

/**
 * GET /api/recipes
 * Returns saved recipes (most recent first).
 */
router.get("/", async (req, res) => {
  try {
    const userId = req?.session?.userId ? String(req.session.userId) : null;

    const filter = userId ? { userId } : {};
    const recipes = await Recipe.find(filter).sort({ createdAt: -1 }).limit(50).lean();

    return res.json({
      recipes: recipes.map((r) => ({
        _id: r._id,
        title: r.title,
        text: r.text,
        meta: r.meta,
        usedAI: r.usedAI,
        modelUsed: r.modelUsed,
        createdAt: r.createdAt
      }))
    });
  } catch (err) {
    console.error("❌ /api/recipes GET error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

module.exports = router;
