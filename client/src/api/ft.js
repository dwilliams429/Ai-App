// client/src/api/ft.js
import api from "./http";

const ft = {
  // ---------- Recipes ----------
  async generateRecipe(payload) {
    const res = await api.post("/recipes/generate", payload);
    return res.data; // { title, text, saved, ... }
  },

  async listRecipes() {
    const res = await api.get("/recipes");
    return res.data; // { recipes: [...] }
  },

  // ---------- Inventory ----------
  async listInventory() {
    const res = await api.get("/inventory");
    return res.data;
  },

  async addInventory(payload) {
    const res = await api.post("/inventory", payload);
    return res.data;
  },

  // ---------- Shopping ----------
  async listShopping() {
    const res = await api.get("/shopping");
    return res.data;
  },

  async addShopping(payload) {
    const res = await api.post("/shopping", payload);
    return res.data;
  },
};

export default ft;
