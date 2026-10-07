const {
    getAllTransaksi,
    getDataSewaAktif,
    getDataKontrakDeposit,
    createTransaksi,
    deleteTransaksi
} = require("../services/transaksiService");

const getTransaksi = async (req, res) => {
    try {
        const transaksi = await getAllTransaksi();
        res.status(200).json(transaksi);
    } catch (error) {
        console.error(
            "Gagal mengambil data transaksi:",
            error.message
        );
        res.status(500).json({
            message: "Gagal mengambil data transaksi"
        });
    }
};

const getDataSewaAktifController = async (req, res) => {
    try {
        const data = await getDataSewaAktif();
        res.status(200).json(data);
    } catch (error) {
        console.error(
            "Gagal mengambil data sewa aktif:",
            error.message
        );
        res.status(500).json({
            message: "Gagal mengambil data sewa aktif"
        });
    }
};

const getKontrakDepositController = async (req, res) => {
    try {
        const data = await getDataKontrakDeposit();
        res.status(200).json(data);
    } catch (error) {
        console.error(
            "Gagal mengambil data kontrak deposit:",
            error.message
        );
        res.status(500).json({
            message: "Gagal mengambil data kontrak deposit"
        });
    }
};

const tambahTransaksi = async (req, res) => {
    try {
        const payload = { ...req.body };

        // Tangkap file foto bukti dari Multer (dukung single upload req.file maupun multiple upload req.files)
        if (req.files && req.files.length > 0) {
            const listNamaFile = req.files.map((file) => file.filename);
            payload.bukti = listNamaFile.join(",");
        } else if (req.file) {
            payload.bukti = req.file.filename;
        }

        const transaksi = await createTransaksi(payload);

        res.status(201).json(transaksi);

    } catch (error) {
        console.error(
            "Gagal menambahkan transaksi:",
            error.message
        );
        res.status(500).json({
            message: error.message
        });
    }
};

const hapusTransaksi = async (req, res) => {
    try {
        const { id } = req.params;

        const transaksi = await deleteTransaksi(id);

        res.status(200).json({
            message: "Transaksi berhasil dihapus",
            data: transaksi
        });

    } catch (error) {
        console.error(
            "Gagal menghapus transaksi:",
            error.message
        );
        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    getTransaksi,
    getDataSewaAktifController,
    getKontrakDepositController, 
    tambahTransaksi,
    hapusTransaksi
};