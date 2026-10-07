// src/seedAdmin.js
const pool = require("./config/database");
const bcrypt = require("bcrypt");

const seedAdmin = async () => {
  try {
    const username = "PagulAdmin";
    const email = "admin.pagul@example.com"; // Ganti dengan email aktif kamu untuk uji coba lupa password nanti
    const plainPassword = "kostnyaman123";

    // Hash password menggunakan bcrypt (salt rounds: 10)
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Cek apakah admin sudah ada
    const check = await pool.query("SELECT * FROM admin WHERE username = $1", [username]);
    if (check.rows.length > 0) {
      console.log("Admin default sudah ada di database.");
      process.exit(0);
    }

    // Insert ke database
    await pool.query(
      `INSERT INTO admin (username, email, password) VALUES ($1, $2, $3)`,
      [username, email, hashedPassword]
    );

    console.log("SUKSES: Akun admin default berhasil dibuat!");
    console.log(`Username: ${username}`);
    console.log(`Email   : ${email}`);
    process.exit(0);
  } catch (error) {
    console.error("Gagal membuat seed admin:", error);
    process.exit(1);
  }
};

seedAdmin();