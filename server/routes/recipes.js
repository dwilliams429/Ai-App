// server/routes/recipes.js
"use strict";

const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const { generateBetterRecipe } = require("../services/aiRecipe");
const Recipe = require("../models/Recipe");

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function stripBullets(line) {
  return String(line || "").replace(/^\s*[-•]\s*/, "").trim();
}

// Also returns a safe text string for the client UI
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
 * POST /recipes/generate   (also works at /api/recipes/generate due to mounts)
 * Body: { ingredients: string[] | string, diet?: string, timeMinutes?: number, time?: number }
 *
 * Response:
 * { text, title, meta, recipe, saved, usedAI, modelUsed }
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

    const doc = await Recipe.create({
      title: recipe?.title || "Recipe",
      text,
      meta: { diet, timeMinutes },
      recipe: recipe || {},
      favorite: false,
    });

    return res.json({
      title: doc.title,
      text: doc.text,
      meta: doc.meta,
      recipe: doc.recipe,
      favorite: doc.favorite,
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
 * GET /recipes  (also /api/recipes)
 * Returns: { recipes: [...] }
 */
router.get("/", async (req, res) => {
  try {
    const recipes = await Recipe.find({}).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ recipes });
  } catch (err) {
    console.error("❌ /recipes GET error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

/**
 * GET /recipes/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

    const doc = await Recipe.findById(id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    return res.json({ recipe: doc });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

/**
 * DELETE /recipes/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

    const doc = await Recipe.findByIdAndDelete(id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

/**
 * PATCH /recipes/:id/favorite
 * Body: { favorite: boolean }
 */
router.patch("/:id/favorite", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

    const favorite = Boolean(req.body?.favorite);

    const doc = await Recipe.findByIdAndUpdate(id, { favorite }, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    return res.json({ recipe: doc });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

module.exports = router;
