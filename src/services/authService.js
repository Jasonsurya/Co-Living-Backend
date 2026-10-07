// src/services/authService.js
const pool = require("../config/database");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

// Konfigurasi Transporter Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 1. FUNGSI LOGIN ADMIN
const loginAdmin = async (username, password) => {
  if (!username || !password) {
    throw new Error("Username dan password wajib diisi");
  }

  const result = await pool.query("SELECT * FROM admin WHERE username = $1", [username]);
  
  if (result.rows.length === 0) {
    throw new Error("Username atau password salah");
  }

  const admin = result.rows[0];
  const isMatch = await bcrypt.compare(password, admin.password);

  if (!isMatch) {
    throw new Error("Username atau password salah");
  }

  return {
    id: admin.id,
    username: admin.username,
    email: admin.email,
  };
};

// 2. FUNGSI REQUEST LUPA PASSWORD (VERIFIKASI SECRET KEY & EMAIL)
const requestLupaPassword = async (email, secretKey) => {
  if (!email) {
    throw new Error("Email wajib diisi untuk pemulihan akun");
  }

  // A. VALIDASI KUNCI RAHASIA (SECRET PASSKEY)
  const serverSecretKey = process.env.RECOVERY_SECRET_KEY || "PAGUL_SECRET_KEY_98234";
  if (!secretKey || secretKey !== serverSecretKey) {
    throw new Error("Akses ditolak! Kunci rahasia pemulihan tidak valid.");
  }

  // B. CEK EMAIL TERDAFTAR DI DATABASE ADMIN
  const result = await pool.query("SELECT * FROM admin WHERE LOWER(email) = LOWER($1)", [email]);

  if (result.rows.length === 0) {
    throw new Error("Email tidak terdaftar dalam sistem admin!");
  }

  const admin = result.rows[0];

  // C. BUAT KODE OTP (5 Karakter)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let otpCode = "";
  for (let i = 0; i < 5; i++) {
    otpCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // D. SIMPAN OTP KE DATABASE
  await pool.query(
    "UPDATE admin SET otp_code = $1 WHERE id = $2",
    [otpCode, admin.id]
  );

  // E. KIRIM EMAIL OTP
  const mailOptions = {
    from: `"Co-Living Pagul" <${process.env.EMAIL_USER}>`,
    to: admin.email,
    subject: "Kode Verifikasi OTP Lupa Password Admin",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; text-align: center;">Co-Living Pagul</h2>
        <p>Halo Admin,</p>
        <p>Anda menerima email ini karena ada permintaan pemulihan akun/reset password untuk dashboard Co-Living Pagul.</p>
        <p>Berikut adalah kode verifikasi OTP 5 karakter Anda:</p>
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f172a; border-radius: 8px; margin: 20px 0;">
          ${otpCode}
        </div>
        <p>Kode ini bersifat rahasia dan hanya berlaku sementara. Jaga kerahasiaan kode ini demi keamanan sistem.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #64748b; text-align: center;">Tim Pengelola Co-Living Pagul</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Gagal mengirim email OTP:", error);
    throw new Error("Gagal mengirim email verifikasi. Periksa koneksi SMTP server.");
  }

  return {
    message: "Kode OTP berhasil dikirim ke email terdaftar",
  };
};

// 3. FUNGSI RESET USERNAME & PASSWORD BARU
const resetPasswordBaru = async (email, otp, newUsername, newPassword, secretKey) => {
  if (!email || !otp || !newUsername || !newPassword) {
    throw new Error("Semua field (Email, OTP, Username Baru, Password Baru) wajib diisi");
  }

  // A. VALIDASI KUNCI RAHASIA (SECRET PASSKEY)
  const serverSecretKey = process.env.RECOVERY_SECRET_KEY || "PAGUL_SECRET_KEY_98234";
  if (!secretKey || secretKey !== serverSecretKey) {
    throw new Error("Akses ditolak! Kunci rahasia pemulihan tidak valid.");
  }

  // B. VERIFIKASI EMAIL & OTP
  const result = await pool.query(
    "SELECT * FROM admin WHERE LOWER(email) = LOWER($1) AND UPPER(otp_code) = UPPER($2)",
    [email, otp]
  );

  if (result.rows.length === 0) {
    throw new Error("Kode OTP salah atau email tidak terdaftar!");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // C. UPDATE USERNAME DAN PASSWORD BARU
  await pool.query(
    "UPDATE admin SET username = $1, password = $2, otp_code = NULL WHERE id = $3",
    [newUsername, hashedPassword, result.rows[0].id]
  );

  return {
    message: "Username dan password baru berhasil diperbarui. Silakan login kembali.",
  };
};

module.exports = {
  loginAdmin,
  requestLupaPassword,
  resetPasswordBaru,
};