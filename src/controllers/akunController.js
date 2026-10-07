const {
    getAllAkun
} = require("../services/akunService");

const getAkun = async (req, res) => {
    try {
        const akun = await getAllAkun();

        res.json(akun);
    } catch (error) {
        console.error("Gagal mengambil data akun:", error.message);

        res.status(500).json({
            message: "Gagal mengambil data akun"
        });
    }
};

module.exports = {
    getAkun
};