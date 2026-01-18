// server/services/aiRecipe.js
"use strict";

/**
 * Gemini is OPTIONAL.
 * This file must work even if @google/generative-ai is NOT installed.
 */
let GoogleGenerativeAI = null;
try {
  ({ GoogleGenerativeAI } = require("@google/generative-ai"));
} catch {
  GoogleGenerativeAI = null;
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/* -------------------- helpers -------------------- */

const uniq = (arr) => Array.from(new Set(arr));

const clean = (s) =>
  String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[,.-]+|[,.-]+$/g, "");

const normalize = (s) =>
  clean(s)
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(optional|to taste|as needed)\b/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const parseList = (v) =>
  uniq(
    (Array.isArray(v) ? v : String(v || "").split(","))
      .map(clean)
      .filter(Boolean)
  );

/* -------------------- title logic -------------------- */

function buildTitle(ings) {
  const n = ings.map(normalize);

  // PB&J is sacred. Never add oil/salt/etc.
  if (n.includes("peanut butter") && (n.includes("jelly") || n.includes("jam"))) {
    return "PB&J Sandwich";
  }

  if (n.includes("chicken") && n.includes("rice") && n.includes("broccoli")) {
    return "Chicken Broccoli Rice Bowl";
  }

  if (n.length === 1) return `${clean(ings[0])} Dish`;
  if (n.length === 2) return `${clean(ings[0])} & ${clean(ings[1])}`;

  return clean(ings[0]) + " Recipe";
}

/* -------------------- fallback recipe -------------------- */

function buildFallbackRecipe({ ingredients, diet, timeMinutes }) {
  const ing = parseList(ingredients);
  const title = buildTitle(ing);

  const steps = [];

  // PB&J special case
  if (title === "PB&J Sandwich") {
    steps.push("Spread peanut butter on one slice of bread.");
    steps.push("Spread jelly on the other slice.");
    steps.push("Press together, slice if desired, and serve.");
  } else {
    steps.push("Prep all ingredients.");
    steps.push("Cook main ingredients until done.");
    steps.push("Combine, adjust seasoning if needed, and serve.");
  }

  return {
    title,
    ingredients: ing.map((x) => `- ${x}`),
    steps: steps.map((s, i) => `${i + 1}. ${s}`),
    meta: {
      diet,
      timeMinutes,
    },
  };
}

/* -------------------- optional Gemini -------------------- */

async function tryGemini({ ingredients, diet, timeMinutes }) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key || !GoogleGenerativeAI) return null;

  const model = new GoogleGenerativeAI(key).getGenerativeModel({
    model: DEFAULT_MODEL,
  });

  const prompt = `
Return JSON only:
{
  "title": string,
  "ingredients": string[],
  "steps": string[]
}

Ingredients: ${JSON.stringify(ingredients)}
Diet: ${diet}
Time: ${timeMinutes}
`.trim();

  const res = await model.generateContent(prompt);
  const text = res?.response?.text?.() || "";
  const parsed = JSON.parse(text.replace(/```json|```/g, ""));

  return {
    title: parsed.title,
    ingredients: parsed.ingredients.map((x) => `- ${x}`),
    steps: parsed.steps.map((s, i) => `${i + 1}. ${s}`),
    meta: { diet, timeMinutes },
  };
}

/* -------------------- public API -------------------- */

async function generateBetterRecipe(input) {
  try {
    const ai = await tryGemini(input);
    if (ai) return { recipe: ai, usedAI: true };
  } catch (e) {
    console.warn("Gemini failed, using fallback:", e.message);
  }

  return {
    recipe: buildFallbackRecipe(input),
    usedAI: false,
  };
}

module.exports = {
  generateBetterRecipe,
};
