// src/controllers/suratController.js
const fs = require("fs");
const path = require("path");

const {
    generateSurat,
    uploadSurat,
    getRiwayatSuratByKontrakId,
} = require("../services/suratService");

const generateSuratController = async (req, res) => {
    try {
        const { kontrak_id } = req.body;

        if (!kontrak_id) {
            return res.status(400).json({
                message: "kontrak_id wajib diisi"
            });
        }

        const hasil = await generateSurat(kontrak_id);

        return res.status(200).json({
            message: "Surat berhasil dibuat",
            data: hasil
        });

    } catch (error) {
        console.error("ERROR GENERATE SURAT:");
        console.error(error);

        return res.status(500).json({
            message: error.message || "Gagal membuat surat",
            name: error.name,
            properties: error.properties || null,
        });
    }
};

const lihatSuratController = (req, res) => {
    try {
        const { kontrakId, namaFile } = req.params;

        if (!kontrakId || !namaFile) {
            return res.status(400).json({
                message: "kontrak_id dan nama file surat wajib diisi",
            });
        }

        const baseSuratDir = path.join(__dirname, "../../uploads/surat");

        // 1. Cek dulu di folder kontrak_id yang diminta
        let filePath = path.join(
            baseSuratDir,
            `kontrak_${kontrakId}`,
            namaFile
        );

        // 2. Jika tidak ada di folder kontrak aktif (misal file dari kontrak lama), 
        //    lakukan pencarian otomatis di seluruh subfolder kontrak milik penghuni
        if (!fs.existsSync(filePath)) {
            const subfolders = fs.existsSync(baseSuratDir) ? fs.readdirSync(baseSuratDir) : [];
            for (const folder of subfolders) {
                const checkPath = path.join(baseSuratDir, folder, namaFile);
                if (fs.existsSync(checkPath)) {
                    filePath = checkPath;
                    break;
                }
            }
        }

        console.log("=== LIHAT SURAT ===");
        console.log("Kontrak ID:", kontrakId);
        console.log("Nama file:", namaFile);
        console.log("Path Akhir:", filePath);
        console.log("File ada:", fs.existsSync(filePath));

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "File surat tidak ditemukan",
            });
        }

        return res.sendFile(filePath);
    } catch (error) {
        console.error("ERROR LIHAT SURAT:");
        console.error(error);

        return res.status(500).json({
            message: "Gagal menampilkan surat",
        });
    }
};

const uploadSuratController = async (req, res) => {
    try {
        const { kontrak_id } = req.body;

        if (!kontrak_id) {
            return res.status(400).json({
                message: "kontrak_id wajib diisi"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: "File surat wajib diupload"
            });
        }

        const hasil = await uploadSurat(
            kontrak_id,
            req.file
        );

        return res.status(200).json({
            message: "Surat berhasil diupload",
            data: hasil
        });

    } catch (error) {
        console.error("ERROR UPLOAD SURAT:");
        console.error(error);

        return res.status(500).json({
            message:
                error.message ||
                "Gagal mengupload surat"
        });
    }
};

const getRiwayatSuratController = async (req, res) => {
    try {
        const { kontrakId } = req.params;

        if (!kontrakId) {
            return res.status(400).json({
                message: "kontrak_id wajib diisi",
            });
        }

        const hasil =
            await getRiwayatSuratByKontrakId(
                kontrakId
            );

        return res.status(200).json({
            message: "Riwayat surat berhasil diambil",
            data: hasil,
        });
    } catch (error) {
        console.error(
            "ERROR RIWAYAT SURAT:"
        );
        console.error(error);

        return res.status(500).json({
            message:
                error.message ||
                "Gagal mengambil riwayat surat",
        });
    }
};

module.exports = {
    generateSuratController,
    lihatSuratController,
    uploadSuratController,
    getRiwayatSuratController,
};