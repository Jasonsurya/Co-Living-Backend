const {
    getAllPenghuni,
    createPenghuni,
    updatePenghuni,
    getPenghuniByKamarId,
    getRiwayatPenghuni,
    getDetailRiwayatByKontrakId,
    getPenghuniAktif: getPenghuniAktifService
} = require("../services/penghuniService");

const getPenghuni = async (req, res) => {
    try {
        const data = await getAllPenghuni();
        res.status(200).json(data);
    } catch (error) {
        console.error("Error get all penghuni:", error);
        res.status(500).json({ message: "Gagal mengambil data penghuni" });
    }
};

const tambahPenghuni = async (req, res) => {
    try {
        // Salin data teks dari body
        const payload = { ...req.body };

        // Tangkap file dari req.files (hasil dari middleware multer)
        if (req.files) {
            if (req.files.foto_ktp && req.files.foto_ktp[0]) {
                payload.foto_ktp = req.files.foto_ktp[0].filename;
            }
            if (req.files.foto_diri && req.files.foto_diri[0]) {
                payload.foto_diri = req.files.foto_diri[0].filename;
            }
        }

        const data = await createPenghuni(payload);
        res.status(201).json(data);
    } catch (error) {
        console.error("Error create penghuni:", error);
        res.status(500).json({ message: "Gagal menambahkan penghuni" });
    }
};

const ubahPenghuni = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = { ...req.body };

        // Tangkap file baru jika diunggah saat update
        if (req.files) {
            if (req.files.foto_ktp && req.files.foto_ktp[0]) {
                payload.foto_ktp = req.files.foto_ktp[0].filename;
            }
            if (req.files.foto_diri && req.files.foto_diri[0]) {
                payload.foto_diri = req.files.foto_diri[0].filename;
            }
        }

        const data = await updatePenghuni(id, payload);
        if (!data) {
            return res.status(404).json({ message: "Penghuni tidak ditemukan" });
        }
        res.status(200).json(data);
    } catch (error) {
        console.error("Error update penghuni:", error);
        res.status(500).json({ message: "Gagal memperbarui data penghuni" });
    }
};

const getPenghuniKamar = async (req, res) => {
    try {
        const { kamarId } = req.params;
        const data = await getPenghuniByKamarId(kamarId);
        res.status(200).json(data);
    } catch (error) {
        console.error("Error get penghuni kamar:", error);
        res.status(500).json({ message: error.message });
    }
};

const getRiwayat = async (req, res) => {
    try {
        const data = await getRiwayatPenghuni();
        res.status(200).json(data);
    } catch (error) {
        console.error("Error get riwayat penghuni:", error);
        res.status(500).json({ message: "Gagal mengambil riwayat penghuni" });
    }
};

const getDetailRiwayat = async (req, res) => {
    try {
        const { kontrakId } = req.params;
        const data = await getDetailRiwayatByKontrakId(kontrakId);
        res.status(200).json(data);
    } catch (error) {
        console.error("Error get detail riwayat:", error);
        res.status(500).json({ message: error.message });
    }
};

const getPenghuniAktif = async (req, res) => {
    try {
        const data = await getPenghuniAktifService();
        res.status(200).json(data);
    } catch (error) {
        console.error("Error get penghuni aktif:", error);
        res.status(500).json({
            message: "Gagal mengambil data penghuni aktif"
        });
    }
};

module.exports = {
    getPenghuni,
    tambahPenghuni,
    ubahPenghuni,
    getPenghuniKamar,
    getRiwayat,
    getDetailRiwayat,
    getPenghuniAktif
};