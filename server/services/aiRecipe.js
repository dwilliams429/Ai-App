// server/services/aiRecipe.js
"use strict";

/**
 * This file must work even if @google/generative-ai is NOT installed.
 * (Your Render build can still succeed without Gemini installed.)
 */
let GoogleGenerativeAI = null;
try {
  ({ GoogleGenerativeAI } = require("@google/generative-ai"));
} catch (_) {
  GoogleGenerativeAI = null;
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function uniq(arr) {
  return Array.from(new Set(arr));
}

function cleanToken(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[,.-]+|[,.-]+$/g, "");
}

function normalizeName(s) {
  return cleanToken(s)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(optional|to taste|as needed)\b/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMaybeList(ingredients) {
  const list = Array.isArray(ingredients)
    ? ingredients.map(String)
    : String(ingredients || "")
        .split(",")
        .map((x) => x.trim());

  return uniq(
    list
      .map(cleanToken)
      .map((x) => x.replace(/\s*\([^)]*\)\s*/g, " ").trim())
      .filter(Boolean)
  );
}

function toTitleCase(s) {
  return String(s || "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function prettyFromNorm(n) {
  return toTitleCase(String(n || "").replace(/\s+/g, " ").trim());
}

function hasAny(normList, tokens) {
  const set = new Set(normList);
  return tokens.some((t) => set.has(t));
}

function hasAll(normList, tokens) {
  const set = new Set(normList);
  return tokens.every((t) => set.has(t));
}

function hasEither(normList, a, b) {
  const set = new Set(normList);
  return set.has(a) || set.has(b);
}

function isBreadLike(n) {
  return /\b(bread|bun|roll|bagel|tortilla|wrap|pita)\b/.test(n);
}

function isRiceLike(n) {
  return /\b(rice|quinoa|couscous)\b/.test(n);
}

function isPastaLike(n) {
  return /\b(pasta|noodles)\b/.test(n);
}

function isProtein(n) {
  return /\b(chicken|turkey|beef|pork|lamb|salmon|tuna|shrimp|tofu|tempeh|beans|lentils|egg|eggs|chops|steak)\b/.test(n);
}

function isVeg(n) {
  return /\b(broccoli|spinach|kale|lettuce|pepper|peppers|onion|garlic|tomato|carrot|zucchini|cucumber|mushroom|asparagus)\b/.test(n);
}

function pickOneByRegex(normList, re) {
  return normList.find((x) => re.test(x)) || "";
}

function buildSmarterTitle(rawIngredients) {
  const ingRaw = parseMaybeList(rawIngredients);
  const ingNorm = ingRaw.map(normalizeName).filter(Boolean);

  // PB&J
  if (
    hasAll(ingNorm, ["peanut butter", "jelly"]) ||
    hasAll(ingNorm, ["peanut butter", "jam"]) ||
    hasAll(ingNorm, ["peanut butter", "preserves"])
  ) {
    if (ingNorm.some(isBreadLike)) return "PB&J Sandwich";
    return "PB&J";
  }

  // Lamb chop special
  if (ingNorm.some((x) => /\b(lamb|lamb chops|chops)\b/.test(x)) && ingNorm.some((x) => /\b(lemon)\b/.test(x))) {
    if (ingNorm.some((x) => /\b(cream|heavy whipping cream)\b/.test(x)) && ingNorm.some((x) => /\b(asparagus)\b/.test(x))) {
      return "Lemon Cream Lamb Chops with Asparagus";
    }
    return "Lemon Lamb Chops";
  }

  // Pasta bowl
  if (ingNorm.some(isPastaLike)) {
    const protein = pickOneByRegex(ingNorm, /\b(chicken|shrimp|tuna|salmon|tofu|beans|lentils)\b/);
    const veg = pickOneByRegex(ingNorm, /\b(broccoli|spinach|tomato|mushroom|pepper|onion|garlic|zucchini|asparagus)\b/);
    if (protein && veg) return `${prettyFromNorm(protein)} ${prettyFromNorm(veg)} Pasta`;
    if (protein) return `${prettyFromNorm(protein)} Pasta`;
    if (veg) return `${prettyFromNorm(veg)} Pasta`;
    return "Simple Pasta";
  }

  // Rice bowl
  if (ingNorm.some(isRiceLike)) {
    const protein = pickOneByRegex(ingNorm, /\b(chicken|beef|pork|lamb|salmon|tuna|shrimp|tofu|beans|lentils)\b/);
    const veg = pickOneByRegex(ingNorm, /\b(broccoli|spinach|pepper|onion|tomato|carrot|zucchini|mushroom|asparagus)\b/);
    if (protein && veg) return `${prettyFromNorm(protein)} ${prettyFromNorm(veg)} Rice Bowl`;
    if (protein) return `${prettyFromNorm(protein)} Rice Bowl`;
    if (veg) return `${prettyFromNorm(veg)} Rice Bowl`;
    return "Rice Bowl";
  }

  // Sandwich / wrap
  if (ingNorm.some(isBreadLike)) {
    const protein = pickOneByRegex(ingNorm, /\b(chicken|turkey|beef|pork|tuna|salmon|tofu|beans|egg|eggs)\b/);
    const veg = pickOneByRegex(ingNorm, /\b(lettuce|tomato|onion|cucumber|pepper|spinach)\b/);
    const cheese = hasAny(ingNorm, ["cheese"]);
    if (protein && (veg || cheese)) {
      const parts = [prettyFromNorm(protein)];
      if (cheese) parts.push("Cheese");
      if (veg) parts.push(prettyFromNorm(veg));
      return `${parts.join(" ")} Sandwich`;
    }
    if (protein) return `${prettyFromNorm(protein)} Sandwich`;
    return "Simple Sandwich";
  }

  // General heuristic
  const protein = pickOneByRegex(ingNorm, /\b(chicken|turkey|beef|pork|lamb|salmon|tuna|shrimp|tofu|tempeh|beans|lentils|egg|eggs)\b/);
  const veg = pickOneByRegex(ingNorm, /\b(broccoli|spinach|kale|pepper|peppers|onion|garlic|tomato|carrot|zucchini|cucumber|mushroom|asparagus)\b/);
  const carb = pickOneByRegex(ingNorm, /\b(rice|quinoa|oats|potato|potatoes|bread|tortilla|pasta|noodles)\b/);

  const parts = [];
  if (protein) parts.push(prettyFromNorm(protein));
  if (veg) parts.push(prettyFromNorm(veg));
  if (carb) parts.push(prettyFromNorm(carb));

  if (parts.length >= 2) return `${parts.join(" ")} Bowl`;
  if (parts.length === 1) return `${parts[0]} Bowl`;

  const fallback = ingRaw
    .slice(0, 3)
    .map((x) => cleanToken(x))
    .filter(Boolean)
    .map((x) => toTitleCase(x));

  return fallback.length ? fallback.join(" ") : "Quick Recipe";
}

/**
 * Decide if staples make sense.
 * PB&J should NOT get salt/pepper/oil.
 */
function shouldAddStaples(normList) {
  // PB&J — no staples
  if (
    (hasAll(normList, ["peanut butter", "jelly"]) || hasAll(normList, ["peanut butter", "jam"])) &&
    normList.some(isBreadLike)
  ) {
    return false;
  }
  return true;
}

function buildFallbackRecipe({ ingredients, pantry = [], diet = "None", timeMinutes = 30 }) {
  const ing = parseMaybeList(ingredients);
  const pan = parseMaybeList(pantry);

  const ingNorm = ing.map(normalizeName).filter(Boolean);
  const title = buildSmarterTitle(ing);

  // Helpful pantry items (only include if they exist in pantry)
  const helpfulFromPantry = pan.filter((x) =>
    ["salt", "pepper", "black pepper", "olive oil", "butter", "soy sauce", "vinegar", "lemon", "lime", "garlic"].includes(
      normalizeName(x)
    )
  );

  // Staples only if it makes sense for the dish
  const staples = shouldAddStaples(ingNorm) ? ["salt", "black pepper", "olive oil"] : [];

  const finalIngredients = uniq([
    ...ing,
    ...helpfulFromPantry,
    ...staples.filter((s) => !ingNorm.includes(normalizeName(s))),
  ]);

  // ---- Specific templates (less vague) ----

  // PB&J template
  if (
    (hasAll(ingNorm, ["peanut butter", "jelly"]) || hasAll(ingNorm, ["peanut butter", "jam"])) &&
    ingNorm.some(isBreadLike)
  ) {
    return {
      title: "PB&J Sandwich",
      ingredients: [
        "Bread (2 slices)",
        "Peanut butter (2 tbsp)",
        "Jelly or jam (1–2 tbsp)",
      ],
      steps: [
        "Lay out two slices of bread.",
        "Spread peanut butter evenly on one slice.",
        "Spread jelly/jam on the other slice.",
        "Press slices together, slice in half, and serve.",
      ],
      meta: { diet, timeMinutes: Number(timeMinutes) || 10 },
    };
  }

  // Lamb + lemon + cream + asparagus template
  const hasLamb = ingNorm.some((x) => /\b(lamb|lamb chops|chops)\b/.test(x));
  const hasCream = ingNorm.some((x) => /\b(cream|heavy whipping cream)\b/.test(x));
  const hasLemon = ingNorm.some((x) => /\b(lemon)\b/.test(x));
  const hasAsparagus = ingNorm.some((x) => /\b(asparagus)\b/.test(x));

  if (hasLamb && hasLemon && hasCream && hasAsparagus) {
    return {
      title: "Lemon Cream Lamb Chops with Asparagus",
      ingredients: [
        "Lamb chops",
        "Heavy whipping cream",
        "Lemon (zest + juice)",
        "Asparagus",
        "Salt (to taste)",
        "Black pepper (to taste)",
        "Olive oil (1–2 tbsp)",
      ],
      steps: [
        "Pat lamb chops dry. Season both sides with salt and pepper.",
        "Heat olive oil in a skillet over medium-high heat. Sear lamb chops 3–4 min per side (for medium), then rest on a plate.",
        "In the same pan, add asparagus (trimmed). Cook 4–6 minutes until crisp-tender. Remove to a plate.",
        "Lower heat to medium. Pour in cream, scraping up browned bits. Add lemon zest and a squeeze of lemon juice.",
        "Simmer 2–3 minutes until slightly thickened. Taste and adjust with salt/pepper and more lemon if needed.",
        "Return lamb to the pan briefly to warm. Serve lamb with asparagus and spoon lemon cream sauce over the top.",
      ],
      meta: { diet, timeMinutes: Number(timeMinutes) || 30 },
    };
  }

  // Rice bowl template
  const hasRice = ingNorm.some(isRiceLike);
  const hasPasta = ingNorm.some(isPastaLike);
  const hasBread = ingNorm.some(isBreadLike);

  const protein = ingNorm.find(isProtein) || "";
  const veg = ingNorm.find(isVeg) || "";

  const steps = [];

  if (hasRice) {
    steps.push("Cook rice according to package directions (or warm leftover rice).");
  }
  if (hasPasta) {
    steps.push("Boil pasta/noodles in salted water until al dente; drain.");
  }

  if (protein) {
    steps.push(`Cook the ${protein} in a pan with a little oil over medium-high heat until fully cooked.`);
  } else {
    steps.push("Heat a pan over medium heat.");
  }

  if (veg) {
    steps.push(`Add the ${veg} and cook until tender-crisp, 4–7 minutes.`);
  }

  if (hasBread) {
    steps.push("Toast bread/wrap lightly if desired.");
  }

  steps.push("Assemble, taste, and adjust seasoning. Serve immediately.");

  return {
    title,
    ingredients: finalIngredients.map((x) => stripBullets(`• ${x}`)).map((x) => x.replace(/^•\s*/, "")),
    steps,
    meta: {
      diet,
      timeMinutes: Number(timeMinutes) || 30,
    },
  };
}

function stripBullets(line) {
  return String(line || "").replace(/^\s*[-•]\s*/, "").trim();
}

async function tryGeminiRecipe({ ingredients, pantry = [], diet = "None", timeMinutes = 30 }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || !GoogleGenerativeAI) return null;

  const ing = parseMaybeList(ingredients);
  const pan = parseMaybeList(pantry);

  const prompt = `
Return STRICT JSON ONLY.

{
  "title": string,
  "ingredients": string[],
  "steps": string[],
  "meta": { "diet": string, "timeMinutes": number }
}

Rules:
- Use the provided ingredients (do not invent a different dish).
- You may add basic staples ONLY if they make sense (salt/pepper/oil) and pantry items listed.
- Steps must be specific (no vague "cook protein until done" — include method + time ranges).
- Title should NOT include jokes or commentary.

Ingredients: ${JSON.stringify(ing)}
Pantry: ${JSON.stringify(pan)}
Diet: ${diet}
Time: ${Number(timeMinutes) || 30}
`.trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
  const result = await model.generateContent(prompt);

  const text = result?.response?.text?.() || "";
  const jsonText = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(jsonText);

  return {
    title: parsed.title,
    ingredients: parsed.ingredients,
    steps: parsed.steps,
    meta: parsed.meta,
  };
}

async function generateBetterRecipe({ ingredients, pantry = [], diet = "None", timeMinutes = 30 }) {
  try {
    const aiRecipe = await tryGeminiRecipe({ ingredients, pantry, diet, timeMinutes });
    if (aiRecipe) {
      return { recipe: aiRecipe, usedAI: true, modelUsed: DEFAULT_MODEL };
    }
  } catch (e) {
    console.warn("⚠️ Gemini failed, using fallback:", e?.message || e);
  }

  const recipe = buildFallbackRecipe({ ingredients, pantry, diet, timeMinutes });
  return { recipe, usedAI: false, modelUsed: null };
}

module.exports = {
  generateBetterRecipe,
};
