"use strict";

const mongoose = require("mongoose");

const RecipeSchema = new mongoose.Schema(
  {
    userId: { type: String, default: null },

    title: { type: String, required: true },
    text: { type: String, required: true },

    // structured AI output (optional)
    recipe: { type: mongoose.Schema.Types.Mixed, default: null },

    meta: {
      diet: { type: String, default: "None" },
      timeMinutes: { type: Number, default: 30 }
    },

    usedAI: { type: Boolean, default: false },
    modelUsed: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recipe", RecipeSchema);
