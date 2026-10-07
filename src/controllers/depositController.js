const {
    getSaldoDepositByKontrakId,
    getRiwayatDepositByKontrakId,
    buatDepositAwal,
    potongDeposit,
    prosesDendaDeposit,
    kembalikanDeposit
} = require("../services/depositService");

const getSaldoDeposit = async (req, res) => {
    try {
        const { kontrakId } = req.params;

        const saldo = await getSaldoDepositByKontrakId(kontrakId);

        res.json(saldo);

    } catch (error) {
        console.error(
            "Gagal mengambil saldo deposit:",
            error.message
        );

        res.status(500).json({
            message: error.message
        });
    }
};

const getRiwayatDeposit = async (req, res) => {
    try {
        const { kontrakId } = req.params;

        const riwayat =
            await getRiwayatDepositByKontrakId(kontrakId);

        res.json(riwayat);

    } catch (error) {
        console.error(
            "Gagal mengambil riwayat deposit:",
            error.message
        );

        res.status(500).json({
            message: error.message
        });
    }
};

const buatDepositAwalController = async (req, res) => {
    try {
        const deposit = await buatDepositAwal(req.body);

        res.status(201).json(deposit);

    } catch (error) {
        console.error(
            "Gagal membuat deposit awal:",
            error.message
        );

        res.status(500).json({
            message: error.message
        });
    }
};

const potongDepositController = async (req, res) => {
    try {
        const hasil = await potongDeposit(req.body);

        res.status(200).json(hasil);

    } catch (error) {
        console.error(
            "Gagal memotong deposit:",
            error.message
        );

        res.status(500).json({
            message: error.message
        });
    }
};

const prosesDendaDepositController = async (req, res) => {
    try {
    
        const payload = {
            ...req.body,
            bukti_foto: req.files || [] 
        };

        const hasil = await prosesDendaDeposit(payload);

        res.status(200).json(hasil);

    } catch (error) {
        console.error(
            "Gagal memproses denda deposit:",
            error.message
        );

        res.status(500).json({
            message: error.message
        });
    }
};

const kembalikanDepositController = async (req, res) => {
    try {
        const hasil = await kembalikanDeposit(req.body);

        res.status(200).json(hasil);

    } catch (error) {
        console.error(
            "Gagal mengembalikan deposit:",
            error.message
        );

        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    getSaldoDeposit,
    getRiwayatDeposit,
    buatDepositAwal: buatDepositAwalController,
    potongDeposit: potongDepositController,
    prosesDendaDeposit: prosesDendaDepositController,
    kembalikanDeposit: kembalikanDepositController
};