const {
    getAllKamar,
    isiKamar
} = require("../services/kamarService");

const getKamar = async (req, res) => {
    try {
        const kamar = await getAllKamar();
        res.json(kamar);

    } catch (error) {
        console.error("Gagal mengambil data kamar:", error.message);

        res.status(500).json({
            message: "Terjadi kesalahan saat mengambil data kamar"
        });
    }
};

const prosesIsiKamar = async (req, res) => {
    try {
        const kamarId = req.params.id;
        
        // Salin data teks dari body
        const data = { ...req.body };

        // Tangkap file dari req.files (hasil dari middleware multer)
        if (req.files) {
            if (req.files.foto_ktp && req.files.foto_ktp[0]) {
                data.foto_ktp = req.files.foto_ktp[0].filename;
            }
            if (req.files.foto_diri && req.files.foto_diri[0]) {
                data.foto_diri = req.files.foto_diri[0].filename;
            }
        }

        const hasil = await isiKamar(kamarId, data);

        res.status(201).json({
            message: "Kamar berhasil diisi",
            data: hasil
        });

    } catch (error) {
        console.error("Gagal mengisi kamar:", error.message);

        res.status(400).json({
            message: "Terjadi kesalahan saat mengisi kamar: " + error.message
        });
    }
};

module.exports = {
    getKamar,
    prosesIsiKamar
};