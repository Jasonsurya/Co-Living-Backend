const express = require("express");
const upload = require("../middleware/upload"); // Pastikan path ini sesuai lokasi multer kamu

const {
    getTransaksi,
    getDataSewaAktifController,
    getKontrakDepositController,
    tambahTransaksi,
    hapusTransaksi
} = require("../controllers/transaksiController");

const router = express.Router();

router.get("/", getTransaksi);
router.get("/sewa-aktif", getDataSewaAktifController);
router.get("/kontrak-deposit", getKontrakDepositController);

// Tambahkan upload.array("bukti_foto") untuk menangkap file bukti foto transaksi
router.post("/", upload.array("bukti_foto"), tambahTransaksi);

router.delete("/:id", hapusTransaksi);

module.exports = router;