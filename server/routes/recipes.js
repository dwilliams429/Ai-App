// server/routes/recipes.js
"use strict";

const express = require("express");
const router = express.Router();

const { generateBetterRecipe } = require("../services/aiRecipe");
const Recipe = require("../models/Recipe");

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
 * POST /recipes/generate   (also works at /api/recipes/generate because of server.js mounts)
 * Body: { ingredients: string[] | string, diet?: string, timeMinutes?: number, time?: number }
 *
 * Response:
 * { text: string, title: string, meta: {...}, recipe: {...}, saved: {...}, usedAI: boolean, modelUsed?: string }
 */
router.post("/generate", async (req, res) => {
  try {
    const body = req.body || {};

    // Allow either array or comma string
    const ingredientsRaw = body.ingredients ?? "";
    const diet = String(body.diet || "None");
    const timeMinutes = Number(body.timeMinutes ?? body.time ?? 30) || 30;

    const result = await generateBetterRecipe({
      ingredients: ingredientsRaw,
      pantry: [], // wire later if you want
      diet,
      timeMinutes,
    });

    const recipe = result?.recipe;
    const text = toTextFromRecipeStruct(recipe);

    if (typeof text !== "string" || !text.trim()) {
      return res.status(500).json({ error: "Invalid recipe response (no text)." });
    }

    // ✅ SAVE to MongoDB
    const doc = await Recipe.create({
      title: recipe?.title || "Recipe",
      text,
      meta: { diet, timeMinutes },
      recipe: recipe || {},
      // userId: req.session?.userId || undefined, // optional later
    });

    return res.json({
      title: doc.title,
      text: doc.text,
      meta: doc.meta,
      recipe: doc.recipe,
      saved: { _id: doc._id, createdAt: doc.createdAt },
      usedAI: Boolean(result?.usedAI),
      modelUsed: result?.modelUsed || null,
    });
  } catch (err) {
    console.error("❌ /recipes/generate error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

/**
 * GET /recipes  (also works at /api/recipes)
 * Returns:
 * { recipes: [...] }
 */
router.get("/", async (req, res) => {
  try {
    const recipes = await Recipe.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({ recipes });
  } catch (err) {
    console.error("❌ /recipes GET error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

module.exports = router;
