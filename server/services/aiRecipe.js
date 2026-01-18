// server/services/aiRecipe.js
"use strict";

/**
 * Goal:
 * - Always return a structured recipe:
 *   { title, ingredients: [{ item, amount }...], steps: string[], meta: {diet,timeMinutes}, summary? }
 * - Work even if @google/generative-ai is missing
 * - Fallback generator should be "sane" and avoid adding weird staples to sweet recipes (PB&J)
 */

let GoogleGenerativeAI = null;
try {
  ({ GoogleGenerativeAI } = require("@google/generative-ai"));
} catch (_) {
  // optional dependency; fallback will be used
}

function normStr(s) {
  return String(s || "").trim();
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function normalizeIngredients(input) {
  if (Array.isArray(input)) {
    return input.map(normStr).filter(Boolean);
  }
  const s = normStr(input);
  if (!s) return [];
  return s
    .split(",")
    .map((x) => normStr(x))
    .filter(Boolean);
}

function lowerAll(arr) {
  return arr.map((x) => String(x || "").toLowerCase());
}

function includesAny(haystackArrLower, keywords) {
  return keywords.some((k) => haystackArrLower.some((x) => x.includes(k)));
}

function detectCategory(ingredients) {
  const low = lowerAll(ingredients);

  const hasBread = includesAny(low, ["bread", "bagel", "tortilla", "wrap"]);
  const hasPB = includesAny(low, ["peanut butter", "almond butter", "sunflower butter"]);
  const hasJelly = includesAny(low, ["jelly", "jam", "preserve"]);
  if (hasBread && (hasPB || hasJelly)) return "sweet_sandwich";

  const hasRice = includesAny(low, ["rice", "quinoa", "couscous"]);
  if (hasRice) return "bowl";

  const hasPasta = includesAny(low, ["pasta", "spaghetti", "penne", "noodle"]);
  if (hasPasta) return "pasta";

  const hasEgg = includesAny(low, ["egg"]);
  if (hasEgg && ingredients.length <= 6) return "quick_eggs";

  return "savory";
}

function guessMainProtein(ingredients) {
  const low = lowerAll(ingredients);
  const proteins = [
    ["chicken", "chicken"],
    ["beef", "beef"],
    ["steak", "steak"],
    ["lamb", "lamb chops"],
    ["salmon", "salmon"],
    ["shrimp", "shrimp"],
    ["tofu", "tofu"],
    ["beans", "beans"],
    ["turkey", "turkey"],
    ["pork", "pork"],
  ];
  for (const [key, name] of proteins) {
    if (low.some((x) => x.includes(key))) return name;
  }
  return ingredients[0] || "main ingredient";
}

function titleCase(s) {
  return String(s || "")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function isSweetCategory(category) {
  return category === "sweet_sandwich";
}

function buildAmounts(category, ingredient) {
  const low = ingredient.toLowerCase();

  // Sweet sandwich defaults
  if (category === "sweet_sandwich") {
    if (low.includes("bread")) return "2 slices";
    if (low.includes("bagel")) return "1 bagel, sliced";
    if (low.includes("tortilla") || low.includes("wrap")) return "1 large";
    if (low.includes("peanut butter")) return "2 tbsp";
    if (low.includes("almond butter")) return "2 tbsp";
    if (low.includes("sunflower butter")) return "2 tbsp";
    if (low.includes("jelly") || low.includes("jam") || low.includes("preserve")) return "1–2 tbsp";
    if (low.includes("banana")) return "1/2 banana, sliced";
    if (low.includes("honey")) return "1 tsp (optional)";
    return "to taste";
  }

  // Savory-ish defaults
  if (low.includes("chicken")) return "8 oz (about 2 small breasts or thighs)";
  if (low.includes("lamb")) return "2 chops (10–12 oz total)";
  if (low.includes("beef") || low.includes("steak")) return "10 oz";
  if (low.includes("salmon")) return "2 fillets (10–12 oz total)";
  if (low.includes("shrimp")) return "10 oz, peeled";
  if (low.includes("tofu")) return "14 oz block, pressed";
  if (low.includes("rice")) return "1 cup cooked (or 1/3 cup dry)";
  if (low.includes("quinoa")) return "1 cup cooked (or 1/3 cup dry)";
  if (low.includes("broccoli")) return "2 cups florets";
  if (low.includes("asparagus")) return "1 bunch";
  if (low.includes("lemon")) return "1 lemon (zest + juice)";
  if (low.includes("cream")) return "1/3 cup";
  if (low.includes("pasta") || low.includes("noodle")) return "6–8 oz dry";
  if (low.includes("egg")) return "2 eggs";
  if (low.includes("onion")) return "1/2 medium, sliced";
  if (low.includes("garlic")) return "2 cloves, minced";
  if (low.includes("tomato")) return "1 cup chopped";
  if (low.includes("spinach")) return "2 cups";
  return "to taste";
}

function shouldAddStaples(category, ingredients) {
  if (isSweetCategory(category)) return false;

  const low = lowerAll(ingredients);
  // If the user already included these, don't re-add them
  const hasOil = low.some((x) => x.includes("oil"));
  const hasSalt = low.some((x) => x.includes("salt"));
  const hasPepper = low.some((x) => x.includes("pepper"));

  return {
    addOil: !hasOil,
    addSalt: !hasSalt,
    addPepper: !hasPepper,
  };
}

function addIfMissing(list, item) {
  const low = list.map((x) => x.item.toLowerCase());
  if (!low.includes(item.toLowerCase())) list.push({ item, amount: "to taste" });
}

function buildFallbackRecipe({ ingredients, diet, timeMinutes }) {
  const ing = normalizeIngredients(ingredients);
  const category = detectCategory(ing);
  const main = guessMainProtein(ing);

  const title =
    category === "sweet_sandwich"
      ? `${titleCase(main)} Sandwich`.replace("Jelly Sandwich", "PB&J Sandwich")
      : category === "bowl"
      ? `${titleCase(main)} Bowl`
      : `${titleCase(main)} Recipe`;

  const structuredIngredients = ing.map((item) => ({
    item,
    amount: buildAmounts(category, item),
  }));

  // Add staples only when it makes sense
  const staples = shouldAddStaples(category, ing);
  if (staples.addOil) addIfMissing(structuredIngredients, "olive oil");
  if (staples.addSalt) addIfMissing(structuredIngredients, "salt");
  if (staples.addPepper) addIfMissing(structuredIngredients, "black pepper");

  // Steps by category
  let steps = [];
  if (category === "sweet_sandwich") {
    steps = [
      "Lay out bread (or split the bagel/wrap).",
      "Spread peanut butter evenly on one side. Spread jelly/jam on the other side.",
      "Close the sandwich, press lightly, and slice in half.",
      "Optional: add banana slices or a drizzle of honey for extra flavor.",
    ];
  } else if (category === "bowl") {
    steps = [
      "Cook your base (rice/quinoa) if needed. If using leftover rice, warm it in the microwave or a skillet.",
      `Season ${main} with salt and pepper. Heat a pan over medium-high heat with a small drizzle of oil.`,
      `Cook ${main} until browned and fully cooked (time depends on size). Remove to a plate.`,
      "Cook vegetables in the same pan (add a splash of water if needed) until tender-crisp.",
      "Combine base + protein + vegetables. Finish with lemon juice or any sauce you like. Taste and adjust seasoning.",
    ];
  } else if (category === "pasta") {
    steps = [
      "Bring a pot of salted water to a boil and cook pasta until al dente. Reserve 1/2 cup pasta water.",
      "While pasta cooks, heat a pan over medium heat with a little oil. Cook your main ingredient until done.",
      "Add any vegetables, cook until tender, then add a splash of pasta water to loosen.",
      "Toss pasta into the pan, stir well, and adjust seasoning. Add lemon/cheese/cream if that’s in your ingredient list.",
    ];
  } else if (category === "quick_eggs") {
    steps = [
      "Crack eggs into a bowl, add a pinch of salt and pepper, and whisk.",
      "Heat a nonstick pan over medium-low heat with a tiny bit of oil or butter.",
      "Pour eggs in and gently stir until softly set. Remove from heat while still slightly glossy (they finish cooking off-heat).",
      "Serve immediately with any toppings from your ingredient list.",
    ];
  } else {
    steps = [
      `Prep ingredients: chop vegetables, pat ${main} dry (if applicable), and measure anything liquid.`,
      "Heat a pan over medium-high heat with a drizzle of oil.",
      `Cook ${main} until browned and cooked through. Set aside.`,
      "Cook vegetables/aromatics in the same pan until softened and fragrant.",
      "Return everything to the pan, taste, adjust salt/pepper, and serve hot.",
    ];
  }

  // Trim to timeMinutes vibe (just a gentle nudge)
  const summary =
    timeMinutes <= 20
      ? "Quick and simple recipe designed to come together fast."
      : "A balanced, step-by-step recipe with better structure and flavor.";

  return {
    title,
    summary,
    ingredients: structuredIngredients,
    steps,
    meta: { diet: diet || "None", timeMinutes: Number(timeMinutes) || 30 },
  };
}

function safeJsonParse(txt) {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function coerceAIRecipe(obj, fallbackMeta) {
  const title = normStr(obj?.title) || "Recipe";
  const ingredients = asArray(obj?.ingredients).map((x) => {
    if (typeof x === "string") return { item: x.trim(), amount: "to taste" };
    const item = normStr(x?.item);
    const amount = normStr(x?.amount) || "to taste";
    return item ? { item, amount } : null;
  }).filter(Boolean);

  const steps = asArray(obj?.steps).map((s) => normStr(s)).filter(Boolean);

  return {
    title,
    summary: normStr(obj?.summary) || "",
    ingredients,
    steps,
    meta: {
      diet: fallbackMeta?.diet || "None",
      timeMinutes: fallbackMeta?.timeMinutes || 30,
    },
  };
}

async function generateWithGemini({ ingredients, diet, timeMinutes }) {
  if (!GoogleGenerativeAI) return null;
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return null;

  const ing = normalizeIngredients(ingredients);
  if (!ing.length) return null;

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
Return ONLY valid JSON (no markdown, no code fences).
Create a realistic recipe using ONLY these ingredients (you may add ONLY: salt, pepper, olive oil, butter, water if needed).
But do NOT add salt/pepper/oil for sweet PB&J-style recipes.

Ingredients provided:
${ing.map((x) => `- ${x}`).join("\n")}

Constraints:
- Diet preference: ${diet || "None"}
- Time target: ${Number(timeMinutes) || 30} minutes
- Include quantities for each ingredient (amount as a string).
- Steps must be descriptive and specific (4-8 steps).

JSON shape:
{
  "title": "string",
  "summary": "string",
  "ingredients": [{"item":"string","amount":"string"}],
  "steps": ["string", "..."]
}
`.trim();

  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.() || "";
  const parsed = safeJsonParse(text);

  if (!parsed) return null;

  const recipe = coerceAIRecipe(parsed, { diet, timeMinutes });

  // extra sanity: remove staples if PB&J-ish
  const category = detectCategory(recipe.ingredients.map((x) => x.item));
  if (isSweetCategory(category)) {
    recipe.ingredients = recipe.ingredients.filter((x) => {
      const l = x.item.toLowerCase();
      return !["salt", "black pepper", "pepper", "olive oil"].some((k) => l.includes(k));
    });
  }

  // ensure minimum content
  if (!recipe.ingredients.length || recipe.steps.length < 3) return null;

  return { recipe, usedAI: true, modelUsed: "gemini-1.5-flash" };
}

async function generateBetterRecipe({ ingredients, pantry = [], diet = "None", timeMinutes = 30 }) {
  // 1) Try Gemini if available
  const ai = await generateWithGemini({ ingredients, diet, timeMinutes });
  if (ai) return ai;

  // 2) Fallback: deterministic, sane, quantified
  const recipe = buildFallbackRecipe({ ingredients, diet, timeMinutes });
  return { recipe, usedAI: false, modelUsed: null };
}

module.exports = { generateBetterRecipe };
