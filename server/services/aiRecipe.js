// server/services/aiRecipe.js
"use strict";

/**
 * generateBetterRecipe()
 * - NEVER throws if Gemini fails (prevents 500s from Gemini issues)
 * - Works even if @google/generative-ai isn't installed
 * - Provides quantities + more descriptive steps
 * - Avoids salt/pepper/oil for PB&J and other non-savory recipes
 */

function normalizeList(input) {
  if (Array.isArray(input)) return input.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof input === "string") {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function lower(s) {
  return String(s || "").toLowerCase();
}

function includesAny(text, needles) {
  const t = lower(text);
  return needles.some((n) => t.includes(lower(n)));
}

function classifyRecipe(ingredients) {
  const joined = ingredients.map((x) => lower(x)).join(" ");

  const hasBread = includesAny(joined, ["bread", "bun", "bagel", "tortilla", "wrap"]);
  const hasPb = includesAny(joined, ["peanut butter", "almond butter", "sunflower butter", "pb"]);
  const hasJelly = includesAny(joined, ["jelly", "jam", "preserves"]);
  const hasFruit = includesAny(joined, ["banana", "strawberry", "blueberry", "apple", "grape", "mango", "pineapple"]);
  const hasYogurtMilk = includesAny(joined, ["milk", "yogurt", "kefir", "whey", "protein"]);
  const hasLeafy = includesAny(joined, ["lettuce", "spinach", "kale", "arugula"]);
  const hasPastaRice = includesAny(joined, ["pasta", "spaghetti", "penne", "rice", "noodle", "ramen", "quinoa", "couscous"]);
  const hasEgg = includesAny(joined, ["egg", "eggs"]);
  const hasCheese = includesAny(joined, ["cheese", "cheddar", "mozzarella", "parmesan", "feta"]);
  const hasMeat = includesAny(joined, ["chicken", "beef", "steak", "turkey", "pork", "lamb", "salmon", "shrimp", "tuna"]);
  const hasBeans = includesAny(joined, ["beans", "chickpeas", "lentils", "black beans"]);

  if (hasBread && hasPb && hasJelly) return "pbj";
  if (hasFruit && hasYogurtMilk) return "smoothie";
  if (hasLeafy && (hasCheese || hasBeans || hasMeat)) return "salad";
  if (hasPastaRice) return "bowl";
  if (hasEgg && (hasBread || hasCheese)) return "breakfast";

  return "savory";
}

function titleCase(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function buildFallbackRecipe({ ingredients, diet = "None", timeMinutes = 30 }) {
  const canon = normalizeList(ingredients);
  const kind = classifyRecipe(canon);

  const meta = { diet, timeMinutes: Number(timeMinutes) || 30 };

  // PB&J
  if (kind === "pbj") {
    const title = "PB&J Sandwich";

    const ingredientsOut = [
      "2 slices bread",
      "2 tbsp peanut butter (or nut/seed butter)",
      "1–2 tbsp jelly/jam/preserves",
    ];

    if (canon.some((x) => includesAny(x, ["banana"]))) ingredientsOut.push("1/2 banana, sliced (optional)");
    if (canon.some((x) => includesAny(x, ["honey"]))) ingredientsOut.push("1 tsp honey (optional)");

    const steps = [
      "Lay out the bread slices. If you want it warm, toast the bread lightly (optional).",
      "Spread peanut butter evenly on one slice (edge to edge so it acts as a moisture barrier).",
      "Spread jelly/jam on the other slice. Add banana/honey if using.",
      "Close the sandwich, press gently, slice in half, and serve.",
    ];

    return { recipe: { title, ingredients: ingredientsOut, steps, meta }, usedAI: false, modelUsed: null };
  }

  // Smoothie
  if (kind === "smoothie") {
    const title = "Fruit Smoothie";
    const fruit = canon.filter((x) => includesAny(x, ["banana", "strawberry", "blueberry", "mango", "pineapple", "berries", "apple"]));
    const dairy = canon.find((x) => includesAny(x, ["milk", "yogurt", "kefir"])) || "milk";

    const ingredientsOut = [
      fruit[0] ? `1 cup ${fruit[0]} (fresh or frozen)` : "1 cup mixed fruit (fresh or frozen)",
      fruit[1] ? `1/2 cup ${fruit[1]} (fresh or frozen)` : null,
      `3/4 cup ${dairy}`,
      "1/2 cup ice (optional, thicker smoothie)",
    ].filter(Boolean);

    if (canon.some((x) => includesAny(x, ["protein", "whey"]))) ingredientsOut.push("1 scoop protein powder (optional)");
    if (canon.some((x) => includesAny(x, ["peanut butter", "almond butter"]))) ingredientsOut.push("1 tbsp nut butter (optional)");

    const steps = [
      "Add liquid to blender first (helps blades catch).",
      "Add fruit and any add-ins. Add ice last if using.",
      "Blend 30–60 seconds until smooth. If too thick, add a splash of liquid; if too thin, add more ice/frozen fruit.",
      "Taste and adjust sweetness (more fruit or a drizzle of honey). Serve immediately.",
    ];

    return { recipe: { title, ingredients: ingredientsOut, steps, meta }, usedAI: false, modelUsed: null };
  }

  // Salad
  if (kind === "salad") {
    const title = "Quick Salad";
    const ingredientsOut = [
      "2 cups leafy greens (spinach/lettuce/arugula)",
      "1 cup chopped vegetables (tomato, cucumber, peppers, etc.)",
      "1/2 cup protein (optional): chicken/beans/tuna",
      "2 tbsp dressing (or simple vinaigrette)",
    ];

    const steps = [
      "Wash and dry greens well (dry greens hold dressing better).",
      "Chop vegetables into bite-size pieces and add to a large bowl.",
      "Add protein if using (cooked chicken, rinsed beans, tuna).",
      "Add dressing gradually (a teaspoon at a time), toss, taste, and adjust.",
    ];

    return { recipe: { title, ingredients: ingredientsOut, steps, meta }, usedAI: false, modelUsed: null };
  }

  // Savory: decide entree vs bowl (avoid “Bowl” when no base is present)
  const hasBase = canon.some((x) => includesAny(x, ["rice", "pasta", "noodle", "ramen", "quinoa", "couscous", "tortilla", "wrap"]));
  const protein = canon.find((x) => includesAny(x, ["lamb", "chops", "steak", "beef", "chicken", "turkey", "pork", "salmon", "shrimp", "tuna", "tofu", "beans"])) || "";
  const looksLikeEntree = Boolean(protein) && !hasBase;

  const title = looksLikeEntree ? `${titleCase(protein)} with Vegetables` : "Savory Bowl";

  if (looksLikeEntree) {
    const ingredientsOut = [
      "6–8 oz protein (ex: chicken, salmon, lamb chops)",
      "1–2 cups vegetables, chopped",
      "1 tbsp olive oil (for cooking)",
      "Salt + black pepper, to taste",
      "Optional: 1–2 tbsp sauce (soy/lemon/garlic) if you have it",
    ];

    const steps = [
      `Prep: pat the protein dry and season lightly with salt/pepper. Chop vegetables. (Goal: ~${meta.timeMinutes} minutes total.)`,
      "Heat a pan over medium-high for 2 minutes. Add olive oil.",
      "Sear protein: cook 3–4 minutes without moving to build color. Flip and cook 3–6 minutes more (until cooked through). Rest 3 minutes.",
      "Cook vegetables in the same pan: sauté 4–6 minutes until tender-crisp (add a splash of water if pan gets dry).",
      "Finish: toss with a squeeze of lemon or a spoon of sauce if you have it. Taste and adjust seasoning.",
      "Serve protein with vegetables and any pan juices spooned over top.",
    ];

    return { recipe: { title, ingredients: ingredientsOut, steps, meta }, usedAI: false, modelUsed: null };
  }

  // Bowl
  const ingredientsOut = [
    "6–8 oz protein (or 1 block tofu / 1 can beans)",
    "1 cup cooked base (rice/pasta/noodles) OR cook per package",
    "1–2 cups vegetables, chopped",
    "1–2 tbsp sauce/seasoning (soy/lemon/garlic/etc.)",
    "1 tbsp olive oil (for cooking)",
    "Salt + black pepper, to taste",
  ];

  const steps = [
    `Prep vegetables and protein. Aim to finish in ~${meta.timeMinutes} minutes.`,
    "Cook the base (rice/pasta/noodles) per package. If using leftovers, warm them.",
    "Heat pan over medium-high. Add oil and cook protein until browned and cooked through.",
    "Add vegetables and cook 4–6 minutes until tender-crisp.",
    "Add sauce/seasoning and toss 30–60 seconds. Taste and adjust.",
    "Serve over the base. Add toppings like lemon/herbs/chili flakes if desired.",
  ];

  return { recipe: { title, ingredients: ingredientsOut, steps, meta }, usedAI: false, modelUsed: null };
}

/**
 * Gemini attempt — MUST NEVER crash.
 * If anything fails, return null so fallback is used.
 */
async function tryGemini({ ingredients, pantry = [], diet = "None", timeMinutes = 30 }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  let GoogleGenerativeAI;
  try {
    ({ GoogleGenerativeAI } = require("@google/generative-ai"));
  } catch (_) {
    return null;
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const ing = normalizeList(ingredients);
  const pan = normalizeList(pantry);

  const prompt = `
Return ONLY valid JSON (no markdown, no backticks) in this exact shape:
{
  "title": "string",
  "ingredients": ["string", ...],
  "steps": ["string", ...],
  "meta": { "diet": "string", "timeMinutes": number }
}

Rules:
- Provide realistic QUANTITIES for 1–2 servings.
- Steps must be specific with times/temps and cues.
- Do NOT add random ingredients.
- If PB&J (bread + nut butter + jelly/jam), do NOT add salt/pepper/oil.
Diet: ${diet}
Time: ${Number(timeMinutes) || 30}
Ingredients: ${ing.join(", ")}
Pantry: ${pan.join(", ")}
`.trim();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const resp = await model.generateContent(prompt);

    const raw = resp?.response?.text?.() || "";
    const text = String(raw).trim();

    // Some models wrap JSON in junk—extract first {...} safely
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    const jsonSlice = text.slice(start, end + 1);
    const parsed = JSON.parse(jsonSlice);

    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.title !== "string") return null;
    if (!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.steps)) return null;

    parsed.meta = parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {};
    parsed.meta.diet = String(parsed.meta.diet || diet || "None");
    parsed.meta.timeMinutes = Number(parsed.meta.timeMinutes || timeMinutes || 30) || 30;

    return { recipe: parsed, usedAI: true, modelUsed: modelName };
  } catch (_) {
    return null;
  }
}

async function generateBetterRecipe({ ingredients, pantry = [], diet = "None", timeMinutes = 30 }) {
  const ai = await tryGemini({ ingredients, pantry, diet, timeMinutes });
  if (ai) return ai;
  return buildFallbackRecipe({ ingredients, diet, timeMinutes });
}

module.exports = { generateBetterRecipe };
