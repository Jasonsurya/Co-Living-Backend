const path = require("path");
const fs = require("fs");
const {
  generateSuratKontrakService,
  simpanUploadSuratService,
  getDokumenByKontrakIdService,
  getRiwayatSuratByPenghuniService,
} = require("../services/dokumenKontrakService");

// 1. Generate & Return JSON Metadata
const generateSurat = async (req, res) => {
  console.log("🔥 MASUK dokumenKontrakController -> generateSurat");
  try {
    const { kontrakId } = req.params;
    const force = req.query.force === "true"; // Opsi ?force=true jika ingin paksa buat ulang
    const hasil = await generateSuratKontrakService(kontrakId, force);

    res.status(200).json({
      message: "Surat berhasil digenerate",
      data: hasil,
    });
  } catch (error) {
    console.error("Gagal generate surat:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// 2. Stream PDF Langsung ke Browser (Untuk Tombol "Lihat PDF")
const lihatPdfSurat = async (req, res) => {
  console.log("🔥 MASUK dokumenKontrakController -> lihatPdfSurat");
  try {
    const { kontrakId } = req.params;
    const force = req.query.force === "true";
    const hasil = await generateSuratKontrakService(kontrakId, force);

    if (!fs.existsSync(hasil.fullPath)) {
      return res.status(404).send("File PDF surat tidak ditemukan di server.");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.sendFile(hasil.fullPath);
  } catch (error) {
    console.error("Gagal menampilkan PDF:", error.message);
    res.status(500).send(error.message);
  }
};

// 3. Upload Surat Bertanda Tangan Basah
const uploadSurat = async (req, res) => {
  console.log("🔥 MASUK dokumenKontrakController -> uploadSurat");
  try {
    const { kontrakId } = req.params;
    const hasil = await simpanUploadSuratService(kontrakId, req.file);
    res.status(200).json({
      message: "File surat bertanda tangan berhasil diunggah",
      data: hasil,
    });
  } catch (error) {
    console.error("Gagal upload surat:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// 4. Ambil Semua Dokumen per Kontrak ID
const getDokumenByKontrak = async (req, res) => {
  try {
    const { kontrakId } = req.params;
    const listDokumen = await getDokumenByKontrakIdService(kontrakId);
    res.status(200).json(listDokumen);
  } catch (error) {
    console.error("Gagal mengambil dokumen:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// 5. Ambil Histori Dokumen per Penghuni ID (Untuk Modal Popup History)
const getRiwayatByPenghuni = async (req, res) => {
  try {
    const { penghuniId } = req.params;
    const riwayat = await getRiwayatSuratByPenghuniService(penghuniId);
    res.status(200).json(riwayat);
  } catch (error) {
    console.error("Gagal mengambil riwayat penghuni:", error.message);
    res.status(500).json({ message: error.message });
  }
};

const lihatDokumenByPath = async (req, res) => {
  try {
    const { pathFile } = req.query; 
    if (!pathFile) {
      return res.status(400).send("Path file wajib diisi");
    }

    const fullPath = path.join(__dirname, "../../", pathFile);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).send("File dokumen tidak ditemukan di server.");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.sendFile(fullPath);
  } catch (error) {
    console.error("Gagal membuka dokumen:", error.message);
    res.status(500).send(error.message);
  }
};

module.exports = {
  generateSurat,
  lihatPdfSurat,
  uploadSurat,
  getDokumenByKontrak,
  getRiwayatByPenghuni,
  lihatDokumenByPath, 
};