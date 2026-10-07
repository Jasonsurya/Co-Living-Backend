const {
    getKasHarian
} = require("../services/kasHarianService");


const getKasHarianController = async (req, res) => {
    try {

        const {
            bulan,
            tahun,
            kode,
            arah
        } = req.query;


        const data = await getKasHarian({
            bulan,
            tahun,
            kode,
            arah
        });


        res.status(200).json(data);

    } catch (error) {

        console.error(
            "Gagal mengambil data Kas Harian:",
            error.message
        );


        res.status(error.statusCode || 500).json({
            message:
                error.statusCode
                    ? error.message
                    : "Gagal mengambil data Kas Harian"
        });
    }
};


module.exports = {
    getKasHarianController
};