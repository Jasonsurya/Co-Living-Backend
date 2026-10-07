const express = require("express");
const router = express.Router();
const depositController = require("../controllers/depositController");

// Import middleware multer yang biasa kamu gunakan (sesuaikan path file upload kamu)
const upload = require("../middleware/upload"); // Contoh path middleware multer

router.get("/saldo/:kontrakId", depositController.getSaldoDeposit);
router.get("/riwayat/:kontrakId", depositController.getRiwayatDeposit);

router.post("/awal", depositController.buatDepositAwal);
router.post("/potong", depositController.potongDeposit);

// PERBAIKAN: Tambahkan upload.array("bukti_foto") atau upload.any() di sini
router.post(
    "/denda",
    upload.array("bukti_foto"), // Mengizinkan parser FormData membaca req.body dan req.files
    depositController.prosesDendaDeposit
);

router.post("/kembalikan", depositController.kembalikanDeposit);

module.exports = router;