// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const {
  loginController,
  lupaPasswordController,
  resetPasswordController,
} = require("../controllers/authController");

// Endpoint Login Admin
router.post("/login", loginController);

// Endpoint Lupa Password (Request OTP via Email)
router.post("/lupa-password", lupaPasswordController);

// Endpoint Reset Password (Verifikasi OTP + Set Username & Password Baru)
router.post("/reset-password", resetPasswordController);

module.exports = router;