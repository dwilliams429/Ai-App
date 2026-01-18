// server/routes/recipes.js
"use strict";

const express = require("express");
const router = express.Router();

const Recipe = require("../models/Recipe");
const { generateBetterRecipe } = require("../services/aiRecipe");

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function splitCommaString(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
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
 * ✅ Generates + AUTO-SAVES recipe into Mongo
 */
router.post("/generate", async (req, res) => {
  try {
    const body = req.body || {};

    const ingredientsRaw = body.ingredients ?? "";
    const diet = String(body.diet || "None");
    const timeMinutes = Number(body.timeMinutes ?? body.time ?? 30) || 30;

    // Accept either:
    // - ["chicken","rice"] OR
    // - "chicken, rice"
    const inputIngredients = Array.isArray(ingredientsRaw)
      ? ingredientsRaw.map((s) => String(s).trim()).filter(Boolean)
      : splitCommaString(ingredientsRaw);

    if (!inputIngredients.length) {
      return res.status(400).json({ error: "ingredients must be a non-empty array or comma string" });
    }

    const result = await generateBetterRecipe({
      ingredients: inputIngredients, // pass array OR string; your service can handle both
      pantry: [],
      diet,
      timeMinutes,
    });

    const recipeStruct = result?.recipe;
    const text = toTextFromRecipeStruct(recipeStruct);

    if (!text || !text.trim()) {
      return res.status(500).json({ error: "Invalid recipe response (no text)." });
    }

    // ✅ Save using sessionId so even demo user has persistence
    const sessionId = req.sessionID || "no-session";
    const doc = await Recipe.create({
      sessionId,
      title: recipeStruct?.title || "Recipe",
      text,
      recipe: recipeStruct,
      meta: {
        diet,
        timeMinutes,
        usedAI: Boolean(result?.usedAI),
        modelUsed: result?.modelUsed || null,
        inputIngredients,
      },
    });

    return res.json({
      title: doc.title,
      text: doc.text,
      meta: doc.meta,
      recipe: doc.recipe,
      usedAI: Boolean(doc.meta?.usedAI),
      modelUsed: doc.meta?.modelUsed || null,
      savedId: doc._id,
    });
  } catch (err) {
    console.error("❌ /api/recipes/generate error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

/**
 * GET /api/recipes
 * ✅ Returns saved recipes for this browser session
 */
router.get("/", async (req, res) => {
  try {
    const sessionId = req.sessionID || "no-session";
    const recipes = await Recipe.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Keep a safe client shape
    return res.json({
      recipes: recipes.map((r) => ({
        _id: r._id,
        title: r.title,
        text: r.text,
        meta: r.meta,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("❌ /api/recipes GET error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

module.exports = router;
