const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const {
  generateSurat,
  lihatPdfSurat,
  uploadSurat,
  getDokumenByKontrak,
  getRiwayatByPenghuni,
} = require("../controllers/dokumenKontrakController");

// Konfigurasi Multer khusus ke: uploads/kontrak/[kontrak_id]/signed/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const kontrakId = req.params.kontrakId;
    if (!kontrakId) {
      return cb(new Error("Parameter kontrakId wajib ada di URL"), null);
    }
    const targetDir = path.join(
      __dirname,
      `../../uploads/kontrak/${kontrakId}/signed`
    );
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const kontrakId = req.params.kontrakId;
    const ext = path.extname(file.originalname);
    // Tambahkan hash unik agar file lama tidak saling tertimpa saat re-upload
    const uniqueSuffix = crypto.randomBytes(3).toString("hex");
    cb(null, `surat_kontrak_${kontrakId}_signed_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

// Endpoints Modul Dokumen Kontrak
router.post("/generate/:kontrakId", generateSurat);
router.get("/lihat/:kontrakId", lihatPdfSurat);
router.post("/upload/:kontrakId", upload.single("file_kontrak"), uploadSurat);
router.get("/kontrak/:kontrakId", getDokumenByKontrak);
router.get("/penghuni/:penghuniId", getRiwayatByPenghuni);

module.exports = router;