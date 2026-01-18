"use strict";

/**
 * This file must work even if @google/generative-ai is NOT installed.
 * If the package is missing OR no API key is provided, we fall back to local logic.
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
  return /\b(chicken|turkey|beef|pork|salmon|tuna|shrimp|tofu|tempeh|beans|lentils|egg|eggs)\b/.test(n);
}

function isVeg(n) {
  return /\b(broccoli|spinach|kale|lettuce|pepper|peppers|onion|garlic|tomato|carrot|zucchini|cucumber|mushroom)\b/.test(n);
}

function pickOneByRegex(normList, re) {
  return normList.find((x) => re.test(x)) || "";
}

function prettyFromNorm(n) {
  return toTitleCase(String(n || "").replace(/\s+/g, " ").trim());
}

function detectDishKind(ingNorm) {
  // Signature combos first
  const hasPBJ =
    hasAll(ingNorm, ["peanut butter", "jelly"]) ||
    hasAll(ingNorm, ["peanut butter", "jam"]) ||
    hasAll(ingNorm, ["peanut butter", "preserves"]);

  if (hasPBJ && ingNorm.some(isBreadLike)) return "PBJ";
  if (hasAny(ingNorm, ["egg", "eggs"])) return "EGGS";
  if (ingNorm.some(isPastaLike)) return "PASTA";
  if (ingNorm.some(isRiceLike)) return "RICE_BOWL";
  if (ingNorm.some(isBreadLike)) return "SANDWICH";
  return "GENERIC";
}

function buildSmarterTitle(rawIngredients) {
  const ingRaw = parseMaybeList(rawIngredients);
  const ingNorm = ingRaw.map(normalizeName).filter(Boolean);

  // PB&J
  const isPBJ =
    (hasAll(ingNorm, ["peanut butter", "jelly"]) ||
      hasAll(ingNorm, ["peanut butter", "jam"]) ||
      hasAll(ingNorm, ["peanut butter", "preserves"])) &&
    ingNorm.some(isBreadLike);

  if (isPBJ) return "PB&J Sandwich";

  // Grilled cheese (bread + cheese + butter/oil)
  if (hasAny(ingNorm, ["cheese"]) && ingNorm.some(isBreadLike) && hasEither(ingNorm, "butter", "olive oil")) {
    return "Grilled Cheese";
  }

  // Eggs
  if (hasAny(ingNorm, ["egg", "eggs"])) {
    const hasVeg = ingNorm.some(isVeg);
    const hasCheese = hasAny(ingNorm, ["cheese"]);
    if (hasVeg && hasCheese) return "Veggie Cheese Omelet";
    if (hasVeg) return "Veggie Omelet";
    if (hasCheese) return "Cheese Omelet";
    return "Scrambled Eggs";
  }

  // Pasta
  if (ingNorm.some(isPastaLike)) {
    const protein = pickOneByRegex(ingNorm, /\b(chicken|shrimp|tuna|salmon|tofu|beans|lentils)\b/);
    const veg = pickOneByRegex(ingNorm, /\b(broccoli|spinach|tomato|mushroom|pepper|onion|garlic|zucchini)\b/);
    if (protein && veg) return `${prettyFromNorm(protein)} ${prettyFromNorm(veg)} Pasta`;
    if (protein) return `${prettyFromNorm(protein)} Pasta`;
    if (veg) return `${prettyFromNorm(veg)} Pasta`;
    return "Simple Pasta";
  }

  // Rice bowl
  if (ingNorm.some(isRiceLike)) {
    const protein = pickOneByRegex(ingNorm, /\b(chicken|beef|pork|salmon|tuna|shrimp|tofu|beans|lentils)\b/);
    const veg = pickOneByRegex(ingNorm, /\b(broccoli|spinach|pepper|onion|tomato|carrot|zucchini|mushroom)\b/);
    if (protein && veg) return `${prettyFromNorm(protein)} ${prettyFromNorm(veg)} Rice Bowl`;
    if (protein) return `${prettyFromNorm(protein)} Rice Bowl`;
    if (veg) return `${prettyFromNorm(veg)} Rice Bowl`;
    return "Rice Bowl";
  }

  // Sandwich
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
  const protein = pickOneByRegex(ingNorm, /\b(chicken|turkey|beef|pork|salmon|tuna|shrimp|tofu|tempeh|beans|lentils|egg|eggs)\b/);
  const veg = pickOneByRegex(ingNorm, /\b(broccoli|spinach|kale|pepper|peppers|onion|garlic|tomato|carrot|zucchini|cucumber|mushroom)\b/);
  const carb = pickOneByRegex(ingNorm, /\b(rice|quinoa|oats|potato|potatoes)\b/);

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

function shouldAddStaples(dishKind) {
  // PB&J and basic sandwiches should NOT auto-add oil/salt/pepper.
  if (dishKind === "PBJ") return false;
  if (dishKind === "SANDWICH") return false;
  // Anything cooked: yes
  return true;
}

function addStaplesIfAppropriate(finalIngredients, ingNorm, dishKind) {
  if (!shouldAddStaples(dishKind)) return finalIngredients;

  const have = new Set(ingNorm);
  const staples = ["salt", "black pepper", "olive oil"];

  for (const s of staples) {
    if (!have.has(s)) finalIngredients.push(s);
  }
  return finalIngredients;
}

function buildFallbackRecipe({ ingredients, pantry = [], diet = "None", timeMinutes = 30 }) {
  const ing = parseMaybeList(ingredients);
  const pan = parseMaybeList(pantry);

  const ingNorm = ing.map(normalizeName).filter(Boolean);
  const dishKind = detectDishKind(ingNorm);

  const title = buildSmarterTitle(ing);

  // Use pantry only if it's useful (do NOT randomly add stuff)
  const allowedPantry = new Set([
    "butter",
    "olive oil",
    "salt",
    "pepper",
    "black pepper",
    "soy sauce",
    "vinegar",
    "lemon",
    "lime",
    "mayonnaise",
    "mustard"
  ]);

  const helpfulFromPantry = pan.filter((x) => allowedPantry.has(normalizeName(x)));

  let finalIngredients = uniq([...ing, ...helpfulFromPantry]);

  // add staples only when it makes sense
  finalIngredients = addStaplesIfAppropriate(finalIngredients, ingNorm, dishKind);

  // Build human steps based on dish type
  const steps = [];

  if (dishKind === "PBJ") {
    steps.push("Lay out two slices of bread.");
    steps.push("Spread peanut butter on one slice and jelly on the other.");
    steps.push("Press the slices together, slice if you want, and serve.");
  } else if (dishKind === "EGGS") {
    steps.push("Crack eggs into a bowl, add a pinch of salt, and whisk.");
    steps.push("Warm a pan over medium heat with a little butter or oil.");
    steps.push("Pour in eggs and gently stir until softly set. Serve immediately.");
  } else if (dishKind === "RICE_BOWL") {
    const protein = ingNorm.find(isProtein) || "";
    const veg = ingNorm.find(isVeg) || "";
    steps.push("Warm rice (or cook it if needed).");
    if (protein) steps.push(`Cook the ${protein} in a pan until done.`);
    if (veg) steps.push(`Add the ${veg} and cook until tender-crisp.`);
    steps.push("Add rice, season to taste, and toss everything together. Serve.");
  } else if (dishKind === "PASTA") {
    const protein = ingNorm.find(isProtein) || "";
    const veg = ingNorm.find(isVeg) || "";
    steps.push("Boil pasta in salted water until al dente, then drain (save a splash of pasta water).");
    if (protein) steps.push(`Cook the ${protein} in a pan until done.`);
    if (veg) steps.push(`Add the ${veg} and cook until tender.`);
    steps.push("Toss pasta with the pan mixture, loosen with a splash of pasta water if needed, and serve.");
  } else if (dishKind === "SANDWICH") {
    steps.push("Lay out bread (or a wrap).");
    steps.push("Layer your ingredients, then close the sandwich.");
    steps.push("Slice and serve.");
  } else {
    // Generic safe fallback (still edible)
    steps.push("Prep your ingredients.");
    steps.push("Cook any raw protein until done.");
    steps.push("Cook vegetables until tender.");
    steps.push("Combine, season to taste, and serve.");
  }

  return {
    title,
    ingredients: finalIngredients.map((x) => cleanToken(x)).filter(Boolean),
    steps: steps.map((s) => String(s || "").trim()).filter(Boolean),
    meta: {
      diet,
      timeMinutes: Number(timeMinutes) || 30
    }
  };
}

function extractJsonObject(text) {
  const t = String(text || "");
  const match = t.match(/\{[\s\S]*\}/);
  return match ? match[0] : "";
}

async function tryGeminiRecipe({ ingredients, pantry = [], diet = "None", timeMinutes = 30 }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || !GoogleGenerativeAI) return null;

  const ing = parseMaybeList(ingredients);
  const pan = parseMaybeList(pantry);

  const prompt = `
Return STRICT JSON ONLY. No markdown, no commentary.

Schema:
{
  "title": string,
  "ingredients": string[],
  "steps": string[],
  "meta": { "diet": string, "timeMinutes": number }
}

Hard rules:
- Make a REAL dish a human would eat.
- Use the provided ingredients; you may add ONLY basic staples (salt, pepper, oil, water) and pantry items listed.
- If ingredients strongly imply a common dish, choose that dish.
  - Example: bread + peanut butter + jelly => "PB&J Sandwich" (do NOT add oil/salt/pepper).
- Steps must be clear, specific, and in a logical order (no vague "cook protein/veg" placeholders).
- Ingredients should include reasonable amounts when possible (e.g. "2 slices bread", "1 tbsp peanut butter").
- Title must not include jokes or commentary.

Ingredients: ${JSON.stringify(ing)}
Pantry: ${JSON.stringify(pan)}
Diet: ${diet}
TimeMinutes: ${Number(timeMinutes) || 30}
`.trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
  const result = await model.generateContent(prompt);

  const text = result?.response?.text?.() || "";
  const jsonText = extractJsonObject(text).replace(/```json|```/g, "").trim();
  if (!jsonText) return null;

  const parsed = JSON.parse(jsonText);

  if (!parsed || typeof parsed !== "object") return null;
  if (!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.steps)) return null;

  return {
    title: String(parsed.title || "Recipe"),
    ingredients: parsed.ingredients.map((x) => String(x || "").trim()).filter(Boolean),
    steps: parsed.steps.map((x) => String(x || "").trim()).filter(Boolean),
    meta: {
      diet: String(parsed?.meta?.diet || diet || "None"),
      timeMinutes: Number(parsed?.meta?.timeMinutes ?? timeMinutes ?? 30) || 30
    }
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
  generateBetterRecipe
};
