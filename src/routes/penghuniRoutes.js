const express = require("express");
const upload = require("../middleware/upload"); // Sesuaikan path ini dengan lokasi file konfigurasi multer kamu

const {
    getPenghuni,
    tambahPenghuni,
    ubahPenghuni,
    getPenghuniKamar,
    getRiwayat,
    getDetailRiwayat,
    getPenghuniAktif
} = require("../controllers/penghuniController");

const router = express.Router();

router.get("/", getPenghuni);

router.get("/aktif", getPenghuniAktif);

router.get("/riwayat", getRiwayat);

router.get("/riwayat/:kontrakId", getDetailRiwayat);

router.get("/kamar/:kamarId", getPenghuniKamar);

// Tambahkan upload.fields di sini untuk menangkap file KTP dan Foto Diri
router.post(
    "/",
    upload.fields([
        { name: "foto_ktp", maxCount: 1 },
        { name: "foto_diri", maxCount: 1 }
    ]),
    tambahPenghuni
);

router.put(
    "/:id",
    upload.fields([
        { name: "foto_ktp", maxCount: 1 },
        { name: "foto_diri", maxCount: 1 }
    ]),
    ubahPenghuni
);

module.exports = router;