// client/src/api/ft.js
import api from "./http";

/**
 * Try multiple endpoints for the same action.
 * If an endpoint 404s, we try the next one.
 */
async function tryRequest(makeRequestFns) {
  let lastErr = null;

  for (const fn of makeRequestFns) {
    try {
      const res = await fn();
      return res?.data;
    } catch (err) {
      const status = err?.response?.status;
      // If endpoint doesn't exist, try next
      if (status === 404) {
        lastErr = err;
        continue;
      }
      // Any other error -> stop immediately (auth, 500, validation, etc)
      throw err;
    }
  }

  // If we got here, everything 404'd
  const msg =
    lastErr?.response?.data?.error ||
    lastErr?.message ||
    "API route not found (all candidate endpoints returned 404).";
  throw new Error(msg);
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

const ft = {
  // ---------- Recipes ----------
  async generateRecipe(payload) {
    const data = await tryRequest([
      () => api.post("/recipes/generate", payload),
      () => api.post("/recipe/generate", payload),
      () => api.post("/ai/recipe", payload),
      () => api.post("/ai/generate", payload),
      () => api.post("/generate", payload),
    ]);
    return data;
  },

  async listRecipes() {
    const data = await tryRequest([
      () => api.get("/recipes"),
      () => api.get("/recipe"),
      () => api.get("/saved-recipes"),
    ]);
    // normalize common shapes
    return {
      recipes: asArray(data?.recipes ?? data?.items ?? data),
    };
  },

  // ---------- Inventory ----------
  async listInventory() {
    const data = await tryRequest([
      () => api.get("/inventory"),
      () => api.get("/items"),
    ]);
    return {
      items: asArray(data?.items ?? data?.inventory ?? data),
    };
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
    return {
      items: asArray(data?.items ?? data?.shopping ?? data),
    };
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
