const {
  getAllKontrak,
  getKontrakAktif,
  createKontrak,
  perpanjangKontrak,
  keluarKamar,
} = require("../services/kontrakService");

const getKontrak = async (req, res) => {
  try {
    const kontrak = await getAllKontrak();
    res.json(kontrak);
  } catch (error) {
    console.error("Gagal mengambil data kontrak:", error.message);
    res.status(500).json({ message: "Gagal mengambil data kontrak" });
  }
};

const getKontrakAktifController = async (req, res) => {
  try {
    const kontrak = await getKontrakAktif();
    res.json(kontrak);
  } catch (error) {
    console.error("Gagal mengambil kontrak aktif:", error.message);
    res.status(500).json({ message: "Gagal mengambil kontrak aktif" });
  }
};

const tambahKontrak = async (req, res) => {
  try {
    const kontrak = await createKontrak(req.body);
    res.status(201).json(kontrak);
  } catch (error) {
    console.error("Gagal menambahkan kontrak:", error.message);
    res.status(500).json({ message: error.message || "Gagal menambahkan kontrak" });
  }
};

const perpanjangKontrakController = async (req, res) => {
  try {
    const { kamarId } = req.params;
    const kontrak = await perpanjangKontrak({
      kamar_id: kamarId,
      tanggal_perjanjian: req.body.tanggal_perjanjian,
      tanggal_mulai: req.body.tanggal_mulai,
      tanggal_berakhir: req.body.tanggal_berakhir,
    });

    res.status(201).json(kontrak);
  } catch (error) {
    console.error("Gagal memperpanjang kontrak:", error.message);
    res.status(400).json({ message: error.message });
  }
};

const keluarKamarController = async (req, res) => {
  console.log("🟢 [BACKEND] Endpoint /kontrak/keluar/ diakses!");
  console.log("🟢 [BACKEND] req.params:", req.params);
  console.log("🟢 [BACKEND] req.body:", req.body);

  try {
    const { id } = req.params; // atau kamarId
    // ... logika keluar kamar Anda yang sudah ada ...
    
    return res.status(200).json({ success: true, message: "Berhasil keluar kamar" });
  } catch (error) {
    console.error("🔴 [BACKEND ERROR] Keluar kamar error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getKontrak,
  getKontrakAktifController,
  tambahKontrak,
  perpanjangKontrakController,
  keluarKamarController,
};