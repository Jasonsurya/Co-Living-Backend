const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Tentukan folder berdasarkan jenis upload
    let targetFolder = "uploads/bukti"; // Default untuk foto bukti

    if (file.mimetype === "application/pdf" || file.originalname.endsWith(".docx")) {
      targetFolder = "uploads/surat";
    }

    // Buat folder otomatis jika belum ada
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    cb(null, targetFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "bukti-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });
module.exports = upload;