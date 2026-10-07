const {
    createTransaksiSewa,
} = require("../services/transaksiSewaService");

const createTransaksiSewaController = async (req, res) => {
    try {
        const payload = { ...req.body };

        // 1. Tangkap file foto dari Multer jika ada
        if (req.files && req.files.length > 0) {
            const listNamaFile = req.files.map((file) => file.filename);
            payload.bukti = listNamaFile.join(",");
        }

        // 2. Konversi boolean dari FormData (karena FormData mengirim string "true"/"false")
        if (typeof payload.include_deposit === "string") {
            payload.include_deposit = payload.include_deposit === "true";
        }

        const result = await createTransaksiSewa(payload);

        res.status(201).json({
            message: "Transaksi sewa berhasil dicatat",
            data: result,
        });
    } catch (error) {
        console.error(
            "Error create transaksi sewa:",
            error
        );

        res.status(400).json({
            message: error.message,
        });
    }
};

module.exports = {
    createTransaksiSewaController,
};