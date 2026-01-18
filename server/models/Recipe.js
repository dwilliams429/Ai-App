// server/models/Recipe.js
"use strict";

const mongoose = require("mongoose");

const RecipeSchema = new mongoose.Schema(
  {
    // Optional: if you have user/session IDs later, store them
    userId: { type: String, default: null, index: true },

    title: { type: String, required: true },
    text: { type: String, required: true },

    // Structured recipe (useful for future UI)
    ingredients: { type: [String], default: [] },
    steps: { type: [String], default: [] },

    meta: {
      diet: { type: String, default: "None" },
      timeMinutes: { type: Number, default: 30 },
    },

    usedAI: { type: Boolean, default: false },
    modelUsed: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recipe", RecipeSchema);
