// src/controllers/authController.js
const { 
  loginAdmin, 
  requestLupaPassword, 
  resetPasswordBaru 
} = require("../services/authService");

// 1. CONTROLLER LOGIN
const loginController = async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminData = await loginAdmin(username, password);

    return res.status(200).json({
      message: "Login berhasil",
      data: adminData,
    });
  } catch (error) {
    console.error("ERROR LOGIN:", error.message);
    return res.status(401).json({
      message: error.message || "Gagal melakukan login",
    });
  }
};

// 2. CONTROLLER REQUEST LUPA PASSWORD (KIRIM OTP)
const lupaPasswordController = async (req, res) => {
  try {
    // Menerima email dan secretKey dari body
    const { email, secretKey } = req.body;

    const hasil = await requestLupaPassword(email, secretKey);

    return res.status(200).json({
      message: hasil.message,
    });
  } catch (error) {
    console.error("ERROR LUPA PASSWORD:", error.message);
    return res.status(400).json({
      message: error.message || "Gagal memproses permintaan lupa password",
    });
  }
};

// 3. CONTROLLER RESET PASSWORD & USERNAME BARU
const resetPasswordController = async (req, res) => {
  try {
    const { email, otp, newUsername, newPassword, secretKey } = req.body;

    const hasil = await resetPasswordBaru(email, otp, newUsername, newPassword, secretKey);

    return res.status(200).json({
      message: hasil.message,
    });
  } catch (error) {
    console.error("ERROR RESET PASSWORD:", error.message);
    return res.status(400).json({
      message: error.message || "Gagal memperbarui kredensial admin",
    });
  }
};

module.exports = {
  loginController,
  lupaPasswordController,
  resetPasswordController,
};