// server/services/aiRecipe.js
"use strict";

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

function coreNameFromLine(line) {
  let s = cleanToken(line);
  if (!s) return "";

  s = s.replace(/\([^)]*\)/g, " ").trim();
  s = s.replace(
    /^(\d+(\.\d+)?|\d\/\d|\d+\s+\d\/\d)\s*([a-zA-Z]+)?\s+/,
    ""
  ).trim();

  s = s.replace(/^of\s+/i, "").trim();
  s = s.replace(
    /,\s*(chopped|diced|minced|sliced|grated|juiced).*$/i,
    ""
  ).trim();

  return normalizeName(s);
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
  return /\b(chicken|turkey|beef|pork|salmon|tuna|shrimp|tofu|tempeh|beans|lentils|egg|eggs)\b/.test(
    n
  );
}

function isVeg(n) {
  return /\b(broccoli|spinach|kale|lettuce|pepper|peppers|onion|garlic|tomato|carrot|zucchini|cucumber|mushroom)\b/.test(
    n
  );
}

function pickOneByRegex(normList, re) {
  return normList.find((x) => re.test(x)) || "";
}

function prettyFromNorm(n) {
  return toTitleCase(String(n || "").replace(/\s+/g, " ").trim());
}

/**
 * Classify recipe type so we don't "cook" a PB&J.
 * - assembly: no cooking, no staples
 * - simple: light prep, minimal staples
 * - cooked: OK to add salt/pepper/oil
 */
function classifyRecipe(ingNorm) {
  const hasBread = ingNorm.some(isBreadLike);
  const hasRice = ingNorm.some(isRiceLike);
  const hasPasta = ingNorm.some(isPastaLike);
  const hasProtein = ingNorm.some(isProtein);
  const hasVeg = ingNorm.some(isVeg);

  // PB&J / simple sandwich with zero "cooked" ingredients
  const isPBJ =
    (hasAll(ingNorm, ["peanut butter", "jelly"]) ||
      hasAll(ingNorm, ["peanut butter", "jam"]) ||
      hasAll(ingNorm, ["peanut butter", "preserves"])) &&
    hasBread;

  if (isPBJ) return "assembly";

  // If it's clearly a cooked meal (protein + veg OR rice/pasta bowl)
  if ((hasProtein && hasVeg) || hasRice || hasPasta) return "cooked";

  // Bread-based but not cooked (sandwich wrap)
  if (hasBread && !hasRice && !hasPasta && !hasVeg && !hasProtein) return "assembly";
  if (hasBread && !hasRice && !hasPasta) return "simple";

  return "simple";
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

  // Grilled cheese
  if (
    hasAny(ingNorm, ["cheese"]) &&
    ingNorm.some(isBreadLike) &&
    hasEither(ingNorm, "butter", "olive oil")
  ) {
    return "Grilled Cheese";
  }

  // Omelet / eggs
  if (hasAny(ingNorm, ["egg", "eggs"])) {
    const hasVeg = ingNorm.some(isVeg);
    const hasCheese = hasAny(ingNorm, ["cheese"]);
    if (hasVeg && hasCheese) return "Veggie Cheese Omelet";
    if (hasVeg) return "Veggie Omelet";
    if (hasCheese) return "Cheese Omelet";
    return "Scrambled Eggs";
  }

  // Pasta bowl
  if (ingNorm.some(isPastaLike)) {
    const protein = pickOneByRegex(
      ingNorm,
      /\b(chicken|shrimp|tuna|salmon|tofu|beans|lentils)\b/
    );
    const veg = pickOneByRegex(
      ingNorm,
      /\b(broccoli|spinach|tomato|mushroom|pepper|onion|garlic|zucchini)\b/
    );
    if (protein && veg) return `${prettyFromNorm(protein)} ${prettyFromNorm(veg)} Pasta`;
    if (protein) return `${prettyFromNorm(protein)} Pasta`;
    if (veg) return `${prettyFromNorm(veg)} Pasta`;
    return "Simple Pasta";
  }

  // Rice bowl
  if (ingNorm.some(isRiceLike)) {
    const protein = pickOneByRegex(
      ingNorm,
      /\b(chicken|beef|pork|salmon|tuna|shrimp|tofu|beans|lentils)\b/
    );
    const veg = pickOneByRegex(
      ingNorm,
      /\b(broccoli|spinach|pepper|onion|tomato|carrot|zucchini|mushroom)\b/
    );
    if (protein && veg) return `${prettyFromNorm(protein)} ${prettyFromNorm(veg)} Rice Bowl`;
    if (protein) return `${prettyFromNorm(protein)} Rice Bowl`;
    if (veg) return `${prettyFromNorm(veg)} Rice Bowl`;
    return "Rice Bowl";
  }

  // Sandwich / wrap
  if (ingNorm.some(isBreadLike)) {
    const protein = pickOneByRegex(
      ingNorm,
      /\b(chicken|turkey|beef|pork|tuna|salmon|tofu|beans|egg|eggs)\b/
    );
    const veg = pickOneByRegex(
      ingNorm,
      /\b(lettuce|tomato|onion|cucumber|pepper|spinach)\b/
    );
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
  const protein = pickOneByRegex(
    ingNorm,
    /\b(chicken|turkey|beef|pork|salmon|tuna|shrimp|tofu|tempeh|beans|lentils|egg|eggs)\b/
  );
  const veg = pickOneByRegex(
    ingNorm,
    /\b(broccoli|spinach|kale|pepper|peppers|onion|garlic|tomato|carrot|zucchini|cucumber|mushroom)\b/
  );
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

function buildFallbackRecipe({ ingredients, pantry = [], diet = "None", timeMinutes = 30 }) {
  const ing = parseMaybeList(ingredients);
  const pan = parseMaybeList(pantry);
  const ingNorm = ing.map(normalizeName).filter(Boolean);

  const title = buildSmarterTitle(ing);
  const type = classifyRecipe(ingNorm);

  // Only add staples for COOKED meals
  const cookedStaples = ["salt", "black pepper", "olive oil"];

  // Light pantry helpers only if relevant
  const helpfulFromPantry = pan.filter((x) => {
    const n = normalizeName(x);
    return ["salt", "pepper", "black pepper", "olive oil", "butter", "soy sauce", "vinegar", "lemon", "lime"].includes(n);
  });

  let finalIngredients = [...ing];

  if (type === "cooked") {
    finalIngredients = uniq([
      ...finalIngredients,
      ...helpfulFromPantry,
      ...cookedStaples.filter((s) => !ingNorm.includes(normalizeName(s))),
    ]);
  } else {
    // assembly/simple: do NOT add salt/pepper/oil automatically
    finalIngredients = uniq([...finalIngredients]);
  }

  const hasRice = ingNorm.some(isRiceLike);
  const hasPasta = ingNorm.some(isPastaLike);
  const hasBread = ingNorm.some(isBreadLike);
  const protein = ingNorm.find(isProtein) || "";
  const veg = ingNorm.find(isVeg) || "";

  const steps = [];

  if (type === "assembly") {
    // PB&J / no-cook
    if (
      (ingNorm.includes("peanut butter") && (ingNorm.includes("jelly") || ingNorm.includes("jam") || ingNorm.includes("preserves"))) &&
      hasBread
    ) {
      steps.push("Spread peanut butter on one slice of bread.");
      steps.push("Spread jelly/jam on the other slice.");
      steps.push("Press together, slice if you want, and serve.");
    } else if (hasBread) {
      steps.push("Layer the ingredients onto the bread/wrap.");
      steps.push("Close it up, slice, and serve.");
    } else {
      steps.push("Combine the ingredients in a bowl.");
      steps.push("Mix well and serve.");
    }
  } else if (type === "simple") {
    steps.push("Prep ingredients (wash/slice if needed).");
    if (hasBread) steps.push("Assemble the sandwich/wrap and serve.");
    else steps.push("Combine ingredients, season if desired, and serve.");
  } else {
    // cooked
    steps.push("Prep ingredients (wash/slice as needed).");
    if (hasRice) steps.push("Cook rice (or warm leftover rice).");
    if (hasPasta) steps.push("Boil pasta/noodles until al dente, then drain.");
    if (protein) steps.push(`Cook the ${protein} in a pan with oil until done.`);
    if (veg) steps.push(`Add the ${veg} and cook until tender-crisp.`);
    steps.push("Combine everything, season to taste, and serve warm.");
  }

  return {
    title,
    ingredients: finalIngredients,
    steps, // IMPORTANT: plain strings (no numbering)
    meta: { diet, timeMinutes: Number(timeMinutes) || 30, type },
  };
}

async function tryGeminiRecipe({ ingredients, pantry = [], diet = "None", timeMinutes = 30 }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || !GoogleGenerativeAI) return null;

  const ing = parseMaybeList(ingredients);
  const pan = parseMaybeList(pantry);
  const ingNorm = ing.map(normalizeName).filter(Boolean);
  const type = classifyRecipe(ingNorm);

  const prompt = `
Return STRICT JSON ONLY (no markdown fences).

{
  "title": string,
  "ingredients": string[],
  "steps": string[],
  "meta": { "diet": string, "timeMinutes": number, "type": "assembly" | "simple" | "cooked" }
}

Rules:
- Use the provided ingredients (do not invent a totally different dish).
- If type is "assembly", do NOT add salt/pepper/oil and do NOT include cooking steps.
- If type is "cooked", you may add basic staples (salt, pepper, oil, water) and pantry items listed.
- Keep steps human and specific. No generic filler.

Type: ${type}
Ingredients: ${JSON.stringify(ing)}
Pantry: ${JSON.stringify(pan)}
Diet: ${diet}
TimeMinutes: ${Number(timeMinutes) || 30}
`.trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
  const result = await model.generateContent(prompt);

  const text = result?.response?.text?.() || "";
  const jsonText = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(jsonText);

  // Minimum validation
  if (!parsed?.title || !Array.isArray(parsed.ingredients) || !Array.isArray(parsed.steps)) {
    throw new Error("Gemini returned invalid JSON shape.");
  }

  return {
    title: String(parsed.title),
    ingredients: parsed.ingredients.map(String),
    steps: parsed.steps.map(String),
    meta: {
      diet: String(parsed?.meta?.diet ?? diet),
      timeMinutes: Number(parsed?.meta?.timeMinutes ?? timeMinutes) || 30,
      type: String(parsed?.meta?.type ?? type),
    },
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

function computeMissingShoppingItems(recipeNames, inventoryItems) {
  const inStock = new Set(
    (inventoryItems || [])
      .filter((x) => x && x.name && x.done === false)
      .map((x) => normalizeName(x.name))
  );

  const missing = [];
  for (const r of recipeNames || []) {
    const core = coreNameFromLine(r);
    if (!core) continue;
    if (["salt", "pepper", "black pepper", "water"].includes(core)) continue;
    if (inStock.has(core)) continue;

    const softHit = Array.from(inStock).some((x) => x.includes(core) || core.includes(x));
    if (softHit) continue;

    missing.push(cleanToken(r));
  }

  return uniq(missing).filter(Boolean);
}

module.exports = {
  generateBetterRecipe,
  computeMissingShoppingItems,
};
