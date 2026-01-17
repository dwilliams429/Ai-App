// client/src/api/ft.js
import api from "./http";

/**
 * A single "feature tools" object used by pages/components.
 * Your UI expects methods like:
 *  - ft.generateRecipe()
 *  - ft.listRecipes()
 *  - ft.listInventory()
 *  - ft.listShopping()
 *
 * These hit your backend through axios instance `api`,
 * which already includes baseURL and credentials.
 */

// -----------------------
// Recipes
// -----------------------
async function generateRecipe({ ingredients = [], diet = "None", time = 30 }) {
  // Preferred: POST /api/recipes (matches your server/index.mjs demo route)
  // If your real routes differ, we'll adjust after we see network calls.
  const res = await api.post("/recipes", { ingredients, diet, time });
  return res.data;
}

async function listRecipes() {
  const res = await api.get("/recipes");
  return res.data;
}

// Optional helpers if your backend supports them later
async function saveRecipe(payload) {
  const res = await api.post("/recipes/save", payload);
  return res.data;
}

async function deleteRecipe(id) {
  const res = await api.delete(`/recipes/${id}`);
  return res.data;
}

// -----------------------
// Inventory
// -----------------------
async function listInventory() {
  const res = await api.get("/inventory");
  return res.data;
}

async function addInventoryItem(payload) {
  const res = await api.post("/inventory", payload);
  return res.data;
}

async function removeInventoryItem(id) {
  const res = await api.delete(`/inventory/${id}`);
  return res.data;
}

// -----------------------
// Shopping
// -----------------------
async function listShopping() {
  const res = await api.get("/shopping");
  return res.data;
}

async function addShoppingItem(payload) {
  const res = await api.post("/shopping", payload);
  return res.data;
}

async function updateShoppingItem(id, payload) {
  const res = await api.patch(`/shopping/${id}`, payload);
  return res.data;
}

async function removeShoppingItem(id) {
  const res = await api.delete(`/shopping/${id}`);
  return res.data;
}

const ft = {
  // recipes
  generateRecipe,
  listRecipes,
  saveRecipe,
  deleteRecipe,

  // inventory
  listInventory,
  addInventoryItem,
  removeInventoryItem,

  // shopping
  listShopping,
  addShoppingItem,
  updateShoppingItem,
  removeShoppingItem,
};

export default ft;
