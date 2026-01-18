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
    // optional structured version for future UI
    recipe: { type: Object, default: {} },

    // optional: if you later have users
    userId: { type: mongoose.Schema.Types.ObjectId, required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recipe", RecipeSchema);
