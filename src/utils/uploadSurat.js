const multer = require("multer");
const path = require("path");
const fs = require("fs");

const TEMP_UPLOAD_DIR = path.join(
  __dirname,
  "../../temp/surat-upload"
);

fs.mkdirSync(TEMP_UPLOAD_DIR, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_UPLOAD_DIR);
  },

  filename: (req, file, cb) => {
    const namaFile = `${Date.now()}-${file.originalname}`;

    cb(null, namaFile);
  },
});

const uploadSuratMiddleware = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const ekstensi = path
      .extname(file.originalname)
      .toLowerCase();

    const ekstensiDiizinkan = [
      ".pdf",
      ".doc",
      ".docx",
    ];

    if (!ekstensiDiizinkan.includes(ekstensi)) {
      return cb(
        new Error(
          "Format file harus PDF, DOC, atau DOCX"
        )
      );
    }

    cb(null, true);
  },
});

module.exports = {
  uploadSuratMiddleware,
};