// server/services/aiRecipe.js
"use strict";

/**
 * generateBetterRecipe()
 * - Works EVEN if @google/generative-ai is not installed
 * - Works EVEN if GEMINI_API_KEY is missing or Gemini errors
 * - Produces more descriptive steps + includes quantities
 * - Avoids "salt/pepper/oil" for PB&J and other non-savory recipes
 */

function normalizeList(input) {
  if (Array.isArray(input)) return input.map(String);
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

function includesAny(haystack, needles) {
  const h = lower(haystack);
  return needles.some((n) => h.includes(lower(n)));
}

function classifyRecipe(ingredients) {
  const text = ingredients.map((x) => lower(x)).join(" ");

  const hasBread = includesAny(text, ["bread", "bun", "bagel", "tortilla", "wrap"]);
  const hasPb = includesAny(text, ["peanut butter", "almond butter", "sunflower butter", "pb"]);
  const hasJelly = includesAny(text, ["jelly", "jam", "preserves"]);
  const hasFruit = includesAny(text, ["banana", "strawberry", "blueberry", "apple", "grape"]);
  const hasYogurtMilk = includesAny(text, ["milk", "yogurt", "kefir", "protein", "whey"]);
  const hasPastaRice = includesAny(text, ["pasta", "spaghetti", "penne", "rice", "noodle", "ramen"]);
  const hasEgg = includesAny(text, ["egg", "eggs"]);
  const hasLeafy = includesAny(text, ["lettuce", "spinach", "kale", "arugula"]);
  const hasMeat = includesAny(text, ["chicken", "beef", "steak", "turkey", "pork", "lamb", "salmon", "shrimp", "tuna"]);
  const hasCheese = includesAny(text, ["cheese", "cheddar", "mozzarella", "parmesan", "feta"]);
  const hasBeans = includesAny(text, ["beans", "chickpeas", "lentils", "black beans"]);

  // PB&J / nut-butter sandwich
  if (hasBread && hasPb && hasJelly) return "pbj";

  // Smoothie-ish
  if (hasFruit && hasYogurtMilk) return "smoothie";

  // Salad-ish
  if (hasLeafy && (hasCheese || hasBeans || hasMeat)) return "salad";

  // Pasta / rice bowl
  if (hasPastaRice) return "bowl";

  // Breakfast
  if (hasEgg && (hasBread || hasCheese)) return "breakfast";

  // Default
  return "savory";
}

function titleFrom(ingredients, diet) {
  const main = (ingredients[0] || "Recipe").trim();
  const prefix = diet && diet !== "None" ? `${diet} ` : "";
  return `${prefix}${main.charAt(0).toUpperCase()}${main.slice(1)}`;
}

function buildFallbackRecipe({ ingredients, diet, timeMinutes }) {
  const list = normalizeList(ingredients);
  const kind = classifyRecipe(list);
  const titleBase = titleFrom(list, diet);

  const meta = { diet: diet || "None", timeMinutes: Number(timeMinutes) || 30 };

  // Helper: keep only “real” ingredients user gave, but keep case
  const canon = list.map((x) => x.trim()).filter(Boolean);

  // --- PB&J ---
  if (kind === "pbj") {
    // try to locate key items
    const bread = canon.find((x) => includesAny(x, ["bread", "bun", "bagel", "tortilla", "wrap"])) || "bread";
    const pb = canon.find((x) => includesAny(x, ["peanut butter", "almond butter", "sunflower butter", "pb"])) || "peanut butter";
    const jelly = canon.find((x) => includesAny(x, ["jelly", "jam", "preserves"])) || "jelly";

    const title = includesAny(titleBase, ["pb", "peanut", "jelly", "jam"])
      ? "PB&J Sandwich"
      : `${titleBase} PB&J Sandwich`;

    const ingredientsOut = [
      "2 slices bread",
      "2 tbsp peanut butter",
      "1–2 tbsp jelly or jam",
    ];

    // optional add-ons only if user provided them
    if (canon.some((x) => includesAny(x, ["banana"]))) ingredientsOut.push("1/2 banana, sliced (optional)");
    if (canon.some((x) => includesAny(x, ["honey"]))) ingredientsOut.push("1 tsp honey (optional)");
    if (canon.some((x) => includesAny(x, ["butter"]))) ingredientsOut.push("1 tsp butter (optional, for toasting)");

    const steps = [
      "Lay the bread slices on a cutting board. If you want it warm, lightly toast the bread first (optional).",
      "Spread peanut butter evenly on one slice (edge to edge so it acts like a barrier).",
      "Spread jelly/jam on the other slice. If using banana/honey, add it on top of the peanut butter.",
      "Close the sandwich, press gently, slice in half, and serve.",
    ];

    return {
      recipe: {
        title,
        ingredients: ingredientsOut,
        steps,
        meta,
      },
      usedAI: false,
      modelUsed: null,
    };
  }

  // --- Smoothie ---
  if (kind === "smoothie") {
    const title = `${titleBase} Smoothie`;
    const ingredientsOut = [];

    // crude quantity guesses
    const fruit = canon.filter((x) => includesAny(x, ["banana", "strawberry", "blueberry", "mango", "pineapple", "apple", "berries"]));
    const dairy = canon.find((x) => includesAny(x, ["milk", "yogurt", "kefir"])) || "milk";

    if (fruit.length) {
      // pick 2 fruit max for clarity
      ingredientsOut.push(`1 cup ${fruit[0]} (fresh or frozen)`);
      if (fruit[1]) ingredientsOut.push(`1/2 cup ${fruit[1]} (fresh or frozen)`);
    } else {
      ingredientsOut.push("1 cup mixed fruit (fresh or frozen)");
    }

    ingredientsOut.push(`3/4 cup ${dairy}`);
    ingredientsOut.push("1/2 cup ice (optional, for thicker smoothie)");

    if (canon.some((x) => includesAny(x, ["protein", "whey"]))) ingredientsOut.push("1 scoop protein powder (optional)");
    if (canon.some((x) => includesAny(x, ["peanut butter", "almond butter"]))) ingredientsOut.push("1 tbsp nut butter (optional)");

    const steps = [
      "Add the liquid (milk/yogurt) to the blender first—this helps the blades catch.",
      "Add fruit and any add-ins (protein, nut butter). Add ice last if using.",
      "Blend 30–60 seconds until completely smooth. If too thick, add a splash more liquid; if too thin, add more ice or frozen fruit.",
      "Taste and adjust (more fruit for sweetness). Pour into a glass and serve immediately.",
    ];

    return {
      recipe: { title, ingredients: ingredientsOut, steps, meta },
      usedAI: false,
      modelUsed: null,
    };
  }

  // --- Salad ---
  if (kind === "salad") {
    const title = `${titleBase} Salad`;
    const ingredientsOut = [
      "2 cups leafy greens (spinach/lettuce/arugula)",
      "1 cup chopped vegetables (whatever you have)",
      "1 protein (optional): chicken/beans/tuna",
      "2 tbsp dressing (store-bought or simple vinaigrette)",
    ];

    const steps = [
      "Wash and dry greens well (dry greens hold dressing better).",
      "Chop any vegetables into bite-size pieces and add to a large bowl.",
      "Add protein if using (cooked chicken, rinsed beans, tuna, etc.).",
      "Dress lightly, toss, then taste. Add more dressing a teaspoon at a time so it doesn’t get soggy.",
    ];

    return {
      recipe: { title, ingredients: ingredientsOut, steps, meta },
      usedAI: false,
      modelUsed: null,
    };
  }

  // --- Savory bowl / pan default ---
  {
    const title = `${titleBase} Bowl`;
    const hasProtein = canon.some((x) => includesAny(x, ["chicken", "beef", "pork", "lamb", "shrimp", "salmon", "tofu", "beans"]));
    const hasRicePasta = canon.some((x) => includesAny(x, ["rice", "pasta", "noodle", "ramen"]));
    const ingredientsOut = [];

    // quantities
    if (hasProtein) ingredientsOut.push("1–2 servings protein (about 6–8 oz raw meat OR 1 block tofu OR 1 can beans)");
    if (hasRicePasta) ingredientsOut.push("1 cup cooked rice/pasta/noodles (or cook per package)");
    ingredientsOut.push("1–2 cups vegetables (fresh or frozen), chopped");
    ingredientsOut.push("1–2 tbsp sauce or seasoning (soy sauce, lemon, garlic, etc.)");

    // staples only here (savory makes sense)
    ingredientsOut.push("1 tbsp olive oil (for cooking)");
    ingredientsOut.push("Salt + black pepper, to taste");

    const steps = [
      `Prep: rinse/chop vegetables and pat protein dry. Aim to finish in ~${meta.timeMinutes} minutes.`,
      "Cook the base if needed (rice/pasta/noodles) according to package directions. If using leftovers, warm them.",
      "Heat a pan over medium-high. Add olive oil, then cook protein until browned and cooked through (or until tofu is crisp).",
      "Add vegetables. Cook 4–6 minutes until tender-crisp. Stir often so nothing burns.",
      "Add sauce/seasoning. Toss everything 30–60 seconds so it coats evenly. Taste and adjust salt/pepper.",
      "Serve in a bowl over the base. Add any fresh toppings you like (lemon, herbs, chili flakes).",
    ];

    return {
      recipe: { title, ingredients: ingredientsOut, steps, meta },
      usedAI: false,
      modelUsed: null,
    };
  }
}

async function tryGemini({ ingredients, pantry, diet, timeMinutes }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  let GoogleGenerativeAI;
  try {
    ({ GoogleGenerativeAI } = require("@google/generative-ai"));
  } catch (e) {
    return null; // module not installed
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Use a stable model name (no listModels call)
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const ing = normalizeList(ingredients);
  const pan = normalizeList(pantry);

  // Ask for JSON so we can save structured data reliably.
  // Very important: forbid “random staples” unless appropriate.
  const prompt = `
You are a recipe generator.

Return ONLY valid JSON (no markdown, no backticks) in this exact shape:
{
  "title": "string",
  "ingredients": ["string", ...],
  "steps": ["string", ...],
  "meta": { "diet": "string", "timeMinutes": number }
}

Rules:
- Provide realistic QUANTITIES (cups/tbsp/oz/slices) for 1–2 servings.
- Steps must be specific: temperatures, times, and what to look for.
- Do NOT add random ingredients. Only include:
  (a) the provided ingredients
  (b) optional pantry staples ONLY if they truly make sense for the recipe type.
- If the ingredients clearly form PB&J (bread + nut butter + jelly/jam), DO NOT add salt/pepper/oil.
- Diet: ${diet || "None"}
- Time limit: ${Number(timeMinutes) || 30} minutes
- Ingredients: ${ing.join(", ")}
- Pantry (optional): ${pan.join(", ")}
`;

  try {
    const resp = await model.generateContent(prompt);
    const text = resp?.response?.text?.() || "";
    const parsed = JSON.parse(text);

    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.title !== "string") return null;
    if (!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.steps)) return null;

    // Ensure meta is present
    parsed.meta = parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {};
    parsed.meta.diet = String(parsed.meta.diet || diet || "None");
    parsed.meta.timeMinutes = Number(parsed.meta.timeMinutes || timeMinutes || 30) || 30;

    return { recipe: parsed, usedAI: true, modelUsed: modelName };
  } catch (e) {
    // Gemini can fail (bad key, model blocked, etc). We must never crash.
    return null;
  }
}

async function generateBetterRecipe({ ingredients, pantry, diet, timeMinutes }) {
  // 1) try Gemini (optional)
  const ai = await tryGemini({ ingredients, pantry, diet, timeMinutes });
  if (ai) return ai;

  // 2) fallback deterministic generator
  return buildFallbackRecipe({ ingredients, diet, timeMinutes });
}

module.exports = { generateBetterRecipe };
