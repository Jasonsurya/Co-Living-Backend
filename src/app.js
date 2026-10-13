const express = require("express");
const path = require("path");

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

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Izinkan semua origin sementara untuk memastikan tembus
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// FOLDER UPLOADS STATIC
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