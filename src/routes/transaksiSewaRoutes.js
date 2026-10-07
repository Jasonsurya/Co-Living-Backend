const express = require("express");
const upload = require("../middleware/upload"); // Sesuaikan path lokasi file upload.js kamu
const {
    createTransaksiSewaController,
} = require("../controllers/transaksiSewaController");

const router = express.Router();

// Tambahkan upload.array("bukti_foto") di sini
router.post(
    "/",
    upload.array("bukti_foto"),
    createTransaksiSewaController
);

module.exports = router;