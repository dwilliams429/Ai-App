// client/src/api/ft.js
import api from "./http";

/**
 * Normalize common API shapes:
 * - If API returns { items: [...] } or { data: [...] } or { recipes: [...] }, this returns the array.
 * - If API returns an array directly, returns it.
 * - Otherwise returns [].
 */
function toArray(maybeArrayOrObject, possibleKeys = []) {
  if (Array.isArray(maybeArrayOrObject)) return maybeArrayOrObject;
  if (maybeArrayOrObject && typeof maybeArrayOrObject === "object") {
    for (const k of possibleKeys) {
      if (Array.isArray(maybeArrayOrObject[k])) return maybeArrayOrObject[k];
    }
  }
  return [];
}

async function unwrap(res) {
  return res?.data ?? null;
}

const ft = {
  // ---------- AUTH ----------
  async signup({ name, email, password }) {
    const res = await api.post("/auth/signup", { name, email, password });
    return unwrap(res);
  },

  async login({ email, password }) {
    const res = await api.post("/auth/login", { email, password });
    return unwrap(res);
  },

  async me() {
    const res = await api.get("/auth/me");
    return unwrap(res);
  },

  async logout() {
    const res = await api.post("/auth/logout");
    return unwrap(res);
  },

  // ---------- RECIPES ----------
  async generateRecipe({ ingredients, diet, timeMinutes }) {
    // Your server might expect different keys; this supports common ones.
    const payload = {
      ingredients,
      diet,
      timeMinutes,
      time: timeMinutes,
      minutes: timeMinutes,
    };
    const res = await api.post("/recipes/generate", payload);
    return unwrap(res);
  },

  async listRecipes() {
    const res = await api.get("/recipes");
    const data = await unwrap(res);
    return toArray(data, ["recipes", "items", "data"]);
  },

  async saveRecipe(recipe) {
    const res = await api.post("/recipes", recipe);
    return unwrap(res);
  },

  async deleteRecipe(id) {
    const res = await api.delete(`/recipes/${id}`);
    return unwrap(res);
  },

  // ---------- INVENTORY ----------
  async listInventory() {
    const res = await api.get("/inventory");
    const data = await unwrap(res);
    return toArray(data, ["inventory", "items", "data"]);
  },

  async addInventory({ name, qty }) {
    const res = await api.post("/inventory", { name, qty });
    return unwrap(res);
  },

  async deleteInventory(id) {
    const res = await api.delete(`/inventory/${id}`);
    return unwrap(res);
  },

  // ---------- SHOPPING LIST ----------
  async listShopping() {
    const res = await api.get("/shopping");
    const data = await unwrap(res);
    return toArray(data, ["shopping", "items", "data"]);
  },

  async addShopping({ name, qty }) {
    const res = await api.post("/shopping", { name, qty });
    return unwrap(res);
  },

  async toggleShopping(id) {
    const res = await api.patch(`/shopping/${id}/toggle`);
    return unwrap(res);
  },

  async deleteShopping(id) {
    const res = await api.delete(`/shopping/${id}`);
    return unwrap(res);
  },
};

export default ft;
