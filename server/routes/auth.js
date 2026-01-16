// server/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

function publicUser(u) {
  if (!u) return null;
  return { id: u._id.toString(), name: u.name, email: u.email };
}

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    return res.json({ user: publicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { email = "", password = "", name = "" } = req.body || {};
    const cleanEmail = String(email).trim().toLowerCase();

    if (!cleanEmail.includes("@")) return res.status(400).json({ error: "Valid email is required" });
    if (String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    const existing = await User.findOne({ email: cleanEmail }).lean();
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      email: cleanEmail,
      name: String(name).trim(),
      passwordHash,
    });

    // set session
    req.session.userId = user._id.toString();

    return res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email = "", password = "" } = req.body || {};
    const cleanEmail = String(email).trim().toLowerCase();

    if (!cleanEmail || !password) return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    req.session.userId = user._id.toString();

    return res.json({ user: publicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  try {
    req.session.destroy(() => {
      res.clearCookie("sid");
      return res.json({ ok: true });
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

module.exports = router;
