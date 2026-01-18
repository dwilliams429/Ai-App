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

function ingredientLine(x) {
  // supports string or {item, amount}
  if (typeof x === "string") return stripBullets(x);
  const item = stripBullets(x?.item || "");
  const amount = stripBullets(x?.amount || "");
  if (!item) return "";
  return amount ? `${amount} ${item}` : item;
}

function toTextFromRecipeStruct(recipe) {
  const title = recipe?.title || "Recipe";
  const meta = recipe?.meta || {};
  const timeMinutes = meta.timeMinutes ?? 30;
  const diet = meta.diet ?? "None";

  const ingredientsLines = asArray(recipe?.ingredients)
    .map((x) => ingredientLine(x))
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

  const summary = String(recipe?.summary || "").trim();

  return `${title}
Diet: ${diet}  •  Time: ${timeMinutes} min

${summary ? `Summary:\n${summary}\n\n` : ""}Ingredients:
${ingredientsBlock}

Steps:
${stepsBlock}
`;
}

/**
 * POST /recipes/generate   (also works at /api/recipes/generate because of server.js mounts)
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

    // enforce meta in recipe so formatter always shows correct values
    const recipeWithMeta = {
      ...(recipe || {}),
      meta: { diet, timeMinutes },
    };

    const text = toTextFromRecipeStruct(recipeWithMeta);

    if (typeof text !== "string" || !text.trim()) {
      return res.status(500).json({ error: "Invalid recipe response (no text)." });
    }

    const doc = await Recipe.create({
      title: recipeWithMeta?.title || "Recipe",
      text,
      meta: { diet, timeMinutes },
      recipe: recipeWithMeta || {},
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
