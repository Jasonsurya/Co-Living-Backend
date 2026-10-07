const {
    getBukuBesar
} = require("../services/bukuBesarService");


const getBukuBesarController = async (req, res) => {
    try {
        const data = await getBukuBesar(req.query);

        res.status(200).json(data);

    } catch (error) {
        console.error(
            "Gagal mengambil data Buku Besar:",
            error.message
        );

        res.status(500).json({
            message: "Gagal mengambil data Buku Besar"
        });
    }
};


module.exports = {
    getBukuBesarController
};