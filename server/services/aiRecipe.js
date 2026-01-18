// server/services/aiRecipe.js
"use strict";

/**
 * generateBetterRecipe()
 * - Works EVEN if @google/generative-ai is not installed
 * - Works EVEN if GEMINI_API_KEY is missing or Gemini errors
 * - Produces more descriptive steps + includes quantities
 * - Avoids "salt/pepper/oil" for PB&J and other non-savory recipes
 * - Uses smarter entrée titles so you don't get "Bowl" when you didn't ask for one
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

function titleFrom(ingredients, diet) {
  const main = (ingredients[0] || "Recipe").trim();
  const prefix = diet && diet !== "None" ? `${diet} ` : "";
  return `${prefix}${main.charAt(0).toUpperCase()}${main.slice(1)}`;
}

// Keep this classification focused on “special types” only.
// The entrée vs bowl decision is handled later using presence of a base.
function classifyRecipe(ingredients) {
  const text = ingredients.map((x) => lower(x)).join(" ");

  const hasBread = includesAny(text, ["bread", "bun", "bagel", "tortilla", "wrap"]);
  const hasPb = includesAny(text, ["peanut butter", "almond butter", "sunflower butter", "pb"]);
  const hasJelly = includesAny(text, ["jelly", "jam", "preserves"]);

  const hasFruit = includesAny(text, ["banana", "strawberry", "blueberry", "mango", "pineapple", "apple", "grape", "berries"]);
  const hasYogurtMilk = includesAny(text, ["milk", "yogurt", "kefir", "protein", "whey"]);

  const hasEgg = includesAny(text, ["egg", "eggs"]);
  const hasCheese = includesAny(text, ["cheese", "cheddar", "mozzarella", "parmesan", "feta"]);

  const hasLeafy = includesAny(text, ["lettuce", "spinach", "kale", "arugula"]);
  const hasMeat = includesAny(text, ["chicken", "beef", "steak", "turkey", "pork", "lamb", "salmon", "shrimp", "tuna"]);
  const hasBeans = includesAny(text, ["beans", "chickpeas", "lentils", "black beans"]);

  // PB&J / nut-butter sandwich
  if (hasBread && hasPb && hasJelly) return "pbj";

  // Smoothie-ish
  if (hasFruit && hasYogurtMilk) return "smoothie";

  // Salad-ish
  if (hasLeafy && (hasCheese || hasBeans || hasMeat)) return "salad";

  // Breakfast-ish
  if (hasEgg && (hasBread || hasCheese)) return "breakfast";

  // Default
  return "savory";
}

function titleCase(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function pickFirstMatching(canon, candidates) {
  return canon.find((x) => candidates.some((c) => includesAny(x, [c]))) || "";
}

function pickVeg(canon) {
  return canon.filter((x) =>
    includesAny(x, [
      "asparagus",
      "broccoli",
      "spinach",
      "kale",
      "pepper",
      "peppers",
      "onion",
      "mushroom",
      "mushrooms",
      "zucchini",
      "tomato",
      "tomatoes",
      "carrot",
      "carrots",
      "green bean",
      "green beans",
      "brussels",
      "cauliflower",
    ])
  );
}

function smartEntreeTitle(canon) {
  const protein =
    pickFirstMatching(canon, [
      "lamb chops",
      "lamb",
      "chops",
      "steak",
      "salmon",
      "shrimp",
      "chicken",
      "pork",
      "tofu",
      "beans",
      "turkey",
      "tuna",
    ]) || "Protein";

  const hasLemon = canon.some((x) => includesAny(x, ["lemon"]));
  const hasSoy = canon.some((x) => includesAny(x, ["soy", "teriyaki"]));
  const hasGarlic = canon.some((x) => includesAny(x, ["garlic"]));
  const hasCream = canon.some((x) => includesAny(x, ["cream", "heavy whipping cream"]));
  const hasHoney = canon.some((x) => includesAny(x, ["honey"]));
  const hasSpicy = canon.some((x) => includesAny(x, ["chili", "sriracha", "hot sauce", "pepper flakes"]));

  const veg = pickVeg(canon);
  const vegMain = veg[0] ? titleCase(veg[0]) : "";

  let flavorBits = [];

  if (hasCream && hasLemon) flavorBits.push("Creamy Lemon");
  else if (hasCream) flavorBits.push("Creamy");
  else if (hasLemon) flavorBits.push("Lemon");

  if (hasHoney && hasSoy) flavorBits.push("Honey-Soy");
  else if (hasSoy) flavorBits.push("Soy");

  if (hasGarlic) flavorBits.push("Garlic");
  if (hasSpicy) flavorBits.push("Spicy");

  flavorBits = Array.from(new Set(flavorBits)).filter(Boolean);

  const proteinNice = titleCase(
    protein.includes("chops")
      ? "Lamb Chops"
      : protein.includes("lamb")
      ? "Lamb"
      : protein.includes("steak")
      ? "Steak"
      : protein.includes("salmon")
      ? "Salmon"
      : protein.includes("shrimp")
      ? "Shrimp"
      : protein.includes("chicken")
      ? "Chicken"
      : protein.includes("pork")
      ? "Pork"
      : protein.includes("tofu")
      ? "Tofu"
      : protein.includes("beans")
      ? "Beans"
      : protein.includes("turkey")
      ? "Turkey"
      : protein.includes("tuna")
      ? "Tuna"
      : protein
  );

  const left = flavorBits.length ? `${flavorBits.join(" ")} ${proteinNice}` : proteinNice;
  const right = vegMain ? `with ${vegMain}` : "";

  return `${left}${right ? " " + right : ""}`.trim();
}

function guessProteinQty(canon) {
  const t = canon.join(" ").toLowerCase();
  if (t.includes("shrimp")) return "8–10 oz shrimp (peeled)";
  if (t.includes("salmon")) return "1 salmon fillet (6–8 oz)";
  if (t.includes("steak") || t.includes("beef")) return "1 steak (6–8 oz)";
  if (t.includes("lamb")) return "2–4 lamb chops (about 6–10 oz total)";
  if (t.includes("chicken")) return "1 chicken breast (6–8 oz) or 2 thighs";
  if (t.includes("pork")) return "1 pork chop (6–8 oz)";
  if (t.includes("tofu")) return "1 block tofu (14 oz), pressed and cubed";
  if (t.includes("beans") || t.includes("lentil") || t.includes("chickpea")) return "1 can beans (15 oz), rinsed";
  return "6–8 oz protein (meat/fish) OR 1 block tofu OR 1 can beans";
}

function guessBaseQty(canon) {
  const t = canon.join(" ").toLowerCase();
  if (t.includes("rice")) return "1 cup cooked rice (or 1/2 cup dry)";
  if (t.includes("pasta")) return "2 cups cooked pasta (or 4 oz dry)";
  if (t.includes("noodle") || t.includes("ramen")) return "1 serving noodles (per package)";
  if (t.includes("quinoa")) return "1 cup cooked quinoa (or 1/2 cup dry)";
  if (t.includes("couscous")) return "1 cup cooked couscous (or 1/2 cup dry)";
  if (t.includes("tortilla") || t.includes("wrap")) return "2 tortillas/wraps";
  return "1 cup cooked base (rice/pasta/noodles) if desired";
}

function detectHasBase(canon) {
  return canon.some((x) =>
    includesAny(x, ["rice", "pasta", "noodle", "ramen", "quinoa", "couscous", "tortilla", "wrap", "bread", "bun", "bagel"])
  );
}

function detectLooksLikeSauce(canon) {
  return canon.some((x) => includesAny(x, ["soy", "teriyaki", "sauce", "lemon", "garlic", "honey", "vinegar", "mustard", "bbq"]));
}

function buildFallbackRecipe({ ingredients, diet, timeMinutes }) {
  const list = normalizeList(ingredients);
  const kind = classifyRecipe(list);
  const titleBase = titleFrom(list, diet);

  const meta = { diet: diet || "None", timeMinutes: Number(timeMinutes) || 30 };

  // canonical ingredient list (as user typed)
  const canon = list.map((x) => x.trim()).filter(Boolean);

  // --- PB&J ---
  if (kind === "pbj") {
    const bread = canon.find((x) => includesAny(x, ["bread", "bun", "bagel", "tortilla", "wrap"])) || "bread";
    const pb = canon.find((x) => includesAny(x, ["peanut butter", "almond butter", "sunflower butter", "pb"])) || "peanut butter";
    const jelly = canon.find((x) => includesAny(x, ["jelly", "jam", "preserves"])) || "jelly";

    const title = "PB&J Sandwich";

    const ingredientsOut = [
      `2 slices ${bread}`,
      `2 tbsp ${pb}`,
      `1–2 tbsp ${jelly}`,
    ];

    if (canon.some((x) => includesAny(x, ["banana"]))) ingredientsOut.push("1/2 banana, sliced (optional)");
    if (canon.some((x) => includesAny(x, ["honey"]))) ingredientsOut.push("1 tsp honey (optional)");
    if (canon.some((x) => includesAny(x, ["butter"]))) ingredientsOut.push("1 tsp butter (optional, for toasting)");

    const steps = [
      "Optional: toast the bread lightly (30–90 seconds) so it stays sturdy.",
      "Spread peanut butter edge-to-edge on one slice (this prevents the jelly from soaking in).",
      "Spread jelly/jam on the other slice. If using banana or honey, add it on top of the peanut butter.",
      "Close the sandwich, press gently, slice in half, and serve.",
    ];

    return { recipe: { title, ingredients: ingredientsOut, steps, meta }, usedAI: false, modelUsed: null };
  }

  // --- Smoothie ---
  if (kind === "smoothie") {
    const title = `${titleBase} Smoothie`;
    const ingredientsOut = [];

    const fruit = canon.filter((x) => includesAny(x, ["banana", "strawberry", "blueberry", "mango", "pineapple", "apple", "berries"]));
    const dairy = canon.find((x) => includesAny(x, ["milk", "yogurt", "kefir"])) || "milk";

    if (fruit.length) {
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
      "Add the liquid to the blender first (helps it blend smoothly).",
      "Add fruit + any add-ins. Add ice last if using.",
      "Blend 30–60 seconds until silky smooth. If too thick, add 1–2 tbsp liquid at a time. If too thin, add more frozen fruit/ice.",
      "Taste and adjust. Pour immediately and serve.",
    ];

    return { recipe: { title, ingredients: ingredientsOut, steps, meta }, usedAI: false, modelUsed: null };
  }

  // --- Salad ---
  if (kind === "salad") {
    const title = `${titleBase} Salad`;

    const greens = canon.find((x) => includesAny(x, ["lettuce", "spinach", "kale", "arugula"])) || "leafy greens";
    const protein = canon.find((x) => includesAny(x, ["chicken", "tuna", "salmon", "shrimp", "beans", "chickpeas", "lentils"])) || "";
    const cheese = canon.find((x) => includesAny(x, ["cheese", "feta", "parmesan", "mozzarella", "cheddar"])) || "";

    const ingredientsOut = [
      `2–3 cups ${greens}, washed and dried`,
      "1–2 cups chopped vegetables (whatever you have)",
    ];
    if (protein) ingredientsOut.push(`1/2–1 cup ${protein} (cooked / rinsed, as needed)`);
    if (cheese) ingredientsOut.push(`2 tbsp ${cheese} (optional)`);
    ingredientsOut.push("2 tbsp dressing (or simple vinaigrette)");

    const steps = [
      "Wash and dry greens well (dry greens hold dressing better).",
      "Chop vegetables into bite-size pieces and add to a large bowl.",
      "Add protein/cheese if using.",
      "Dress lightly, toss, then taste. Add more dressing 1 tsp at a time so it doesn’t get soggy.",
    ];

    return { recipe: { title, ingredients: ingredientsOut, steps, meta }, usedAI: false, modelUsed: null };
  }

  // --- Breakfast ---
  if (kind === "breakfast") {
    const title = `${titleBase} Breakfast`;
    const ingredientsOut = [
      "2 eggs",
      "1–2 slices toast (or bread item you have)",
      "1 tbsp butter or oil (optional)",
      "Salt + pepper, to taste",
    ];

    const steps = [
      "Crack eggs into a bowl and whisk 10–15 seconds until uniform.",
      "Heat a nonstick pan over medium. Add a small pat of butter (or a little oil).",
      "Pour in eggs and stir gently for 2–4 minutes until softly set (don’t overcook).",
      "Toast bread. Serve eggs on the side (or on toast).",
    ];

    return { recipe: { title, ingredients: ingredientsOut, steps, meta }, usedAI: false, modelUsed: null };
  }

  // --- Savory default (ENTRÉE vs BOWL) ---
  {
    const hasBase = detectHasBase(canon);

    const proteinItem =
      canon.find((x) =>
        includesAny(x, [
          "lamb",
          "chop",
          "chops",
          "steak",
          "beef",
          "chicken",
          "turkey",
          "pork",
          "salmon",
          "shrimp",
          "tuna",
          "tofu",
          "beans",
          "chickpeas",
          "lentils",
        ])
      ) || "";

    // If you didn't include a base (rice/pasta/noodles/etc.) but you DID include a protein,
    // it should read like an entrée (not a bowl).
    const looksLikeEntree = !!proteinItem && !hasBase;

    const title = looksLikeEntree ? smartEntreeTitle(canon) : `${titleBase} Bowl`;

    const ingredientsOut = [];

    if (looksLikeEntree) {
      ingredientsOut.push(guessProteinQty(canon));

      const veg = pickVeg(canon);
      if (veg.length) ingredientsOut.push(`1–2 cups ${titleCase(veg[0])}, trimmed/chopped`);
      else ingredientsOut.push("1–2 cups vegetables (fresh or frozen), chopped");

      if (detectLooksLikeSauce(canon)) {
        ingredientsOut.push("2–3 tbsp sauce/finish (use what you listed: soy/lemon/garlic/honey, etc.)");
      } else {
        ingredientsOut.push("1 tbsp lemon juice OR 1 tbsp butter + splash of water (quick pan sauce)");
      }

      ingredientsOut.push("1 tbsp olive oil (for cooking)");
      ingredientsOut.push("Salt + black pepper, to taste");

      const steps = [
        `Prep (5 min): pat protein dry (better browning). Trim/chop vegetables into bite-size pieces.`,
        "Season protein lightly with salt/pepper. (If you listed soy/lemon/garlic, save it for the end so it doesn’t burn.)",
        "Heat a pan over medium-high for ~2 minutes until hot. Add olive oil.",
        "Sear protein: add to pan and don’t move it for 3–4 minutes to build a crust. Flip and cook another 3–6 minutes (until cooked through). Remove to a plate and rest 3 minutes.",
        "Cook vegetables in the same pan: add veg + a pinch of salt. Sauté 4–6 minutes until tender-crisp. Add a splash of water if the pan gets dry.",
        "Finish: lower heat. Add your sauce/lemon/garlic/honey and toss 30–60 seconds so it coats. Taste and adjust seasoning.",
        "Plate protein with vegetables. Spoon pan sauce over the top and serve.",
      ];

      return { recipe: { title, ingredients: ingredientsOut, steps, meta }, usedAI: false, modelUsed: null };
    }

    // Bowl-style
    ingredientsOut.push(guessProteinQty(canon));
    ingredientsOut.push(guessBaseQty(canon));
    ingredientsOut.push("1–2 cups vegetables (fresh or frozen), chopped");
    ingredientsOut.push("2 tbsp sauce or seasoning (soy/lemon/garlic/etc.)");
    ingredientsOut.push("1 tbsp olive oil (for cooking)");
    ingredientsOut.push("Salt + black pepper, to taste");

    const steps = [
      `Prep (5 min): chop vegetables. Pat protein dry. Target finish in ~${meta.timeMinutes} minutes.`,
      "Cook your base (rice/pasta/noodles) per package directions if needed. If already cooked, warm it.",
      "Heat a pan over medium-high. Add olive oil.",
      "Cook protein until browned and cooked through (or tofu until crisp), 6–10 minutes depending on type. Remove to a plate.",
      "Cook vegetables in the same pan 4–6 minutes until tender-crisp. Add a splash of water if needed.",
      "Add sauce/seasoning back into the pan and toss everything 30–60 seconds so it coats evenly. Taste and adjust seasoning.",
      "Serve over the base. Optional: add lemon, herbs, chili flakes, or a drizzle of sauce on top.",
    ];

    return { recipe: { title, ingredients: ingredientsOut, steps, meta }, usedAI: false, modelUsed: null };
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

  // Do NOT call listModels or anything that fetches model catalogs.
  // Just call a known model directly.
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

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
- Steps must be specific: temps, times, and what to look for.
- Do NOT add random ingredients.
- Only include: (a) provided ingredients (b) pantry staples ONLY if they truly make sense.
- If ingredients clearly form PB&J (bread + nut butter + jelly/jam), do NOT add salt/pepper/oil.
- Diet: ${diet || "None"}
- Time limit: ${Number(timeMinutes) || 30} minutes
- Ingredients: ${ing.join(", ")}
- Pantry (optional): ${pan.join(", ")}
`;

    const resp = await model.generateContent(prompt);
    const text = resp?.response?.text?.() || "";

    // Sometimes models return whitespace before/after JSON
    const trimmed = String(text || "").trim();

    const parsed = JSON.parse(trimmed);

    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.title !== "string") return null;
    if (!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.steps)) return null;

    parsed.meta = parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {};
    parsed.meta.diet = String(parsed.meta.diet || diet || "None");
    parsed.meta.timeMinutes = Number(parsed.meta.timeMinutes || timeMinutes || 30) || 30;

    return { recipe: parsed, usedAI: true, modelUsed: modelName };
  } catch (e) {
    // Gemini can fail (bad key, model blocked, network, etc). Never crash.
    return null;
  }
}

async function generateBetterRecipe({ ingredients, pantry, diet, timeMinutes }) {
  const ai = await tryGemini({ ingredients, pantry, diet, timeMinutes });
  if (ai) return ai;

  return buildFallbackRecipe({ ingredients, diet, timeMinutes });
}

module.exports = { generateBetterRecipe };
