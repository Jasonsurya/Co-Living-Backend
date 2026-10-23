
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

// ======================================
// KONFIGURASI CORS
// ======================================
const allowedOrigins = [
    "https://co-living-management-system.vercel.app",
    "http://localhost:5000",
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Request tanpa Origin, misalnya server-to-server.
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new Error("Origin tidak diizinkan oleh CORS")
            );
        },
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
        ],
        credentials: true,
        optionsSuccessStatus: 204,
    })
);

// ======================================
// MIDDLEWARE BODY
// ======================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================
// FOLDER UPLOADS STATIC
// ======================================
app.use(
    "/uploads",
    express.static(path.join(__dirname, "../uploads"))
);

// ======================================
// ENDPOINTS API
// ======================================
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
