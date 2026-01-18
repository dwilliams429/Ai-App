// server/models/Recipe.js
"use strict";

const mongoose = require("mongoose");

const RecipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    text: { type: String, required: true }, // what the client displays
    meta: {
      diet: { type: String, default: "None" },
      timeMinutes: { type: Number, default: 30 },
    },

    // structured version for UI (ingredients + steps)
    recipe: {
      type: Object,
      default: {},
    },

    // user features
    favorite: { type: Boolean, default: false },

    // optional later
    userId: { type: mongoose.Schema.Types.ObjectId, required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recipe", RecipeSchema);
