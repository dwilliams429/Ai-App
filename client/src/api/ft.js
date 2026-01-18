// client/src/api/ft.js
import api from "./http";

const ft = {
  // ---------- Recipes ----------
  async generateRecipe(payload) {
    const res = await api.post("/recipes/generate", payload);
    return res.data;
  },

  async listRecipes() {
    const res = await api.get("/recipes");
    return Array.isArray(res.data?.recipes) ? res.data.recipes : [];
  },

  async deleteRecipe(id) {
    const res = await api.delete(`/recipes/${id}`);
    return res.data;
  },

  async setFavorite(id, favorite) {
    const res = await api.patch(`/recipes/${id}/favorite`, { favorite });
    return res.data?.recipe;
  },

  // ---------- Inventory ----------
  async listInventory() {
    const res = await api.get("/inventory");
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },

  async addInventory(payload) {
    const res = await api.post("/inventory", payload);
    return res.data;
  },

  // ---------- Shopping ----------
  async listShopping() {
    const res = await api.get("/shopping");
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },

  async addShopping(payload) {
    const res = await api.post("/shopping", payload);
    return res.data;
  },
};

export default ft;
