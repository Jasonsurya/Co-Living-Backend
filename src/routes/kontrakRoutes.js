// src/routes/kontrakRoutes.js
const express = require("express");
const {
  getKontrak,
  getKontrakAktifController,
  tambahKontrak,
  perpanjangKontrakController,
  keluarKamarController,
} = require("../controllers/kontrakController");

const router = express.Router();

router.get("/", getKontrak);
router.get("/aktif", getKontrakAktifController);
router.post("/", tambahKontrak);
router.post("/perpanjang/:id", perpanjangKontrakController);
router.post("/keluar/:id", keluarKamarController);

module.exports = router;