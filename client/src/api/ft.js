// client/src/api/ft.js
import api from "./http";

/**
 * This file exports BOTH:
 *  - named functions (generateRecipe, listRecipes, ...)
 *  - default object "ft" with those functions
 *
 * So your pages will work whether they import:
 *   import ft from "../api/ft";
 * OR
 *   import * as ft from "../api/ft";
 */

// ---- Named exports ----

export async function generateRecipe(payload) {
  const res = await api.post("/recipes/generate", payload);
  return res.data;
}

export async function listRecipes() {
  const res = await api.get("/recipes");
  return res.data;
}

export async function listInventory() {
  const res = await api.get("/inventory");
  return res.data;
}

export async function listShopping() {
  const res = await api.get("/shopping");
  return res.data;
}

// ---- Default export (object) ----
const ft = {
  generateRecipe,
  listRecipes,
  listInventory,
  listShopping,
};

export default ft;
