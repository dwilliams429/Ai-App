// client/src/api/ft.js
import api from "./http";

/**
 * Normalize backend responses so the UI never crashes.
 * Your UI pages expect arrays (they call .map()).
 * But servers often return objects like { recipes: [...] }.
 */
function pickArray(data, keys = []) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const k of keys) {
      if (Array.isArray(data[k])) return data[k];
    }
  }
  return []; // safe default
}

// ---- Named exports ----

export async function generateRecipe(payload) {
  // Keep full object; Home page usually reads properties off this
  const res = await api.post("/recipes/generate", payload);
  return res.data;
}

export async function listRecipes() {
  const res = await api.get("/recipes");
  return pickArray(res.data, ["recipes", "items", "data", "results"]);
}

export async function listInventory() {
  const res = await api.get("/inventory");
  return pickArray(res.data, ["inventory", "items", "data", "results"]);
}

export async function listShopping() {
  const res = await api.get("/shopping");
  return pickArray(res.data, ["shopping", "items", "data", "results"]);
}

// ---- Default export (object) ----
const ft = {
  generateRecipe,
  listRecipes,
  listInventory,
  listShopping,
};

export default ft;
