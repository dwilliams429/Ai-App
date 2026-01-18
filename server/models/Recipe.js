// server/models/Recipe.js
"use strict";

const mongoose = require("mongoose");

const RecipeSchema = new mongoose.Schema(
  {
    // If you have auth later, you can set this to req.session.userId
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },

    // Works for Demo user / anonymous sessions
    sessionId: { type: String, required: true, index: true },

    title: { type: String, required: true },
    text: { type: String, required: true },

    // Keep structured recipe too (future UI)
    recipe: { type: Object, required: false },

    meta: {
      diet: { type: String, default: "None" },
      timeMinutes: { type: Number, default: 30 },
      usedAI: { type: Boolean, default: false },
      modelUsed: { type: String, default: null },
      inputIngredients: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recipe", RecipeSchema);
