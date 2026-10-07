const express = require("express");
const upload = require("../middleware/upload"); // Sesuaikan dengan folder middleware kamu
const { 
    getKamar,
    prosesIsiKamar
} = require("../controllers/kamarController");

const router = express.Router();

router.get("/", getKamar);

// Tambahkan upload.fields untuk menangkap file foto_ktp dan foto_diri saat isi kamar
router.post(
    "/:id/isi",
    upload.fields([
        { name: "foto_ktp", maxCount: 1 },
        { name: "foto_diri", maxCount: 1 }
    ]),
    prosesIsiKamar
);

module.exports = router;