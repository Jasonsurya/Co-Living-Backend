const express = require("express");
const path = require("path");
const cors = require("cors");

const kamarRoutes = require("./routes/kamarRoutes");
const penghuniRoutes = require("./routes/penghuniRoutes");
const kontrakRoutes = require("./routes/kontrakRoutes");
const kontakDaruratRoutes = require("./routes/kontakDaruratRoutes");
const transaksiRoutes = require("./routes/transaksiRoutes");
const transaksiSewaRoutes = require("./routes/transaksiSewaRoutes");
const akunRoutes = require("./routes/akunRoutes");
const depositRoutes = require("./routes/depositRoutes");
const bukuBesarRoutes = require("./routes/bukuBesarRoutes");
const kasHarianRoutes = require("./routes/kasHarianRoutes");
const authRoutes = require("./routes/authRoutes");
const dokumenKontrakRoutes = require("./routes/dokumenKontrakRoute");

const app = express();

// KONFIGURASI CORS EKSPLISIT UNTUK VERCEL & LOKAL
app.use(cors({
  origin: [
    "https://co-living-management-system.vercel.app", 
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Menangani preflight request secara otomatis agar tidak diblokir browser
app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// FOLDER UPLOADS STATIC (Path Disesuaikan)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ENDPOINTS API
app.use("/api/kamar", kamarRoutes);
app.use("/api/penghuni", penghuniRoutes);
app.use("/api/kontrak", kontrakRoutes);
app.use("/api/kontak-darurat", kontakDaruratRoutes);
app.use("/api/transaksi", transaksiRoutes);
app.use("/api/akun", akunRoutes);
app.use("/api/deposit", depositRoutes);
app.use("/api/buku-besar", bukuBesarRoutes);
app.use("/api/kas-harian", kasHarianRoutes);
app.use("/api/transaksi/sewa", transaksiSewaRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dokumen-kontrak", dokumenKontrakRoutes);

module.exports = app;