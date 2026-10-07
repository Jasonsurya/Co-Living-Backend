const {
    getAllKontakDarurat,
    createKontakDarurat
} = require("../services/kontakDaruratService");

const getKontakDarurat = async (req, res) => {
    try {
        const kontak = await getAllKontakDarurat();

        res.json(kontak);
    } catch (error) {
        console.error(
            "Gagal mengambil data kontak darurat:",
            error.message
        );

        res.status(500).json({
            message: "Gagal mengambil data kontak darurat"
        });
    }
};

const tambahKontakDarurat = async (req, res) => {
    try {
        const kontak = await createKontakDarurat(req.body);

        res.status(201).json(kontak);
    } catch (error) {
        console.error(
            "Gagal menambahkan kontak darurat:",
            error.message
        );

        res.status(500).json({
            message: "Gagal menambahkan kontak darurat"
        });
    }
};

module.exports = {
    getKontakDarurat,
    tambahKontakDarurat
};