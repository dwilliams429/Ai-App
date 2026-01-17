// client/src/api/ft.js
import api from "./http";

/**
 * Try multiple endpoints for the same action.
 * - If an endpoint 404s, we try the next one.
 * - Any other error: throw immediately (401/403/500/etc)
 */
async function tryRequest(makeRequestFns) {
  let lastErr = null;

  for (const fn of makeRequestFns) {
    try {
      const res = await fn();
      return res?.data;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  const msg =
    lastErr?.response?.data?.error ||
    lastErr?.message ||
    "API route not found (all candidate endpoints returned 404).";
  throw new Error(msg);
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function pickArray(data, keys) {
  for (const k of keys) {
    const v = data?.[k];
    if (Array.isArray(v)) return v;
  }
  // sometimes API returns the array directly
  if (Array.isArray(data)) return data;
  return [];
}

const ft = {
  // ---------- Recipes ----------
  async generateRecipe(payload = {}) {
    // Your Home.jsx sends: { ingredients, diet, timeMinutes }
    // Your server stub expects: { ingredients, diet, time }
    const normalized = {
      ingredients: Array.isArray(payload.ingredients) ? payload.ingredients : [],
      diet: payload.diet ?? "None",
      time: Number(payload.timeMinutes ?? payload.time ?? 30) || 30,
    };

    // NOTE: api baseURL likely already includes "/api"
    // so these are "/recipes..." not "/api/recipes..."
    const data = await tryRequest([
      () => api.post("/recipes/generate", normalized),
      () => api.post("/recipes", normalized),
      () => api.post("/recipe/generate", normalized),
      () => api.post("/ai/recipe", normalized),
      () => api.post("/ai/generate", normalized),
      () => api.post("/generate", normalized),
    ]);

    // Return raw data; Home.jsx already tries multiple shapes safely
    return data;
  },

  async listRecipes() {
    const data = await tryRequest([
      () => api.get("/recipes"),
      () => api.get("/recipe"),
      () => api.get("/saved-recipes"),
    ]);

    // ✅ IMPORTANT: return an ARRAY because your pages expect an array
    return pickArray(data, ["recipes", "items", "data"]);
  },

  // ---------- Inventory ----------
  async listInventory() {
    const data = await tryRequest([
      () => api.get("/inventory"),
      () => api.get("/items"),
    ]);

    // ✅ return ARRAY
    return pickArray(data, ["items", "inventory", "data"]);
  },

  async addInventory(payload) {
    const data = await tryRequest([
      () => api.post("/inventory", payload),
      () => api.post("/items", payload),
    ]);
    return data;
  },

  async removeInventory(id) {
    const data = await tryRequest([
      () => api.delete(`/inventory/${id}`),
      () => api.delete(`/items/${id}`),
    ]);
    return data;
  },

  // ---------- Shopping ----------
  async listShopping() {
    const data = await tryRequest([
      () => api.get("/shopping"),
      () => api.get("/shopping-list"),
    ]);

    // ✅ return ARRAY
    return pickArray(data, ["items", "shopping", "data"]);
  },

  async addShopping(payload) {
    const data = await tryRequest([
      () => api.post("/shopping", payload),
      () => api.post("/shopping-list", payload),
    ]);
    return data;
  },

  async removeShopping(id) {
    const data = await tryRequest([
      () => api.delete(`/shopping/${id}`),
      () => api.delete(`/shopping-list/${id}`),
    ]);
    return data;
  },
};

export default ft;
