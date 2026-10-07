const pool = require("../config/database");
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);
const crypto = require("crypto");

const { getDetailKontrakUntukSurat } = require("./kontrakService");

const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Deteksi lokasi LibreOffice di Windows
const getLibreOfficeExecutable = () => {
  const possiblePaths = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "soffice",
  ];
  for (const p of possiblePaths) {
    const cleanPath = p.replace(/"/g, "");
    if (fs.existsSync(cleanPath)) return `"${cleanPath}"`;
  }
  return "soffice";
};

const formatTanggalIndo = (tanggal) => {
  if (!tanggal) return "-";
  const d = new Date(tanggal);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatRupiah = (nom) => "Rp " + Number(nom || 0).toLocaleString("id-ID");

const hitungDurasiBulan = (mulai, berakhir) => {
  if (!mulai || !berakhir) return "1";
  const dMulai = new Date(mulai);
  const dAkhir = new Date(berakhir);
  if (isNaN(dMulai.getTime()) || isNaN(dAkhir.getTime())) return "1";
  const diffMonths =
    (dAkhir.getFullYear() - dMulai.getFullYear()) * 12 +
    (dAkhir.getMonth() - dMulai.getMonth());
  return diffMonths > 0 ? String(diffMonths) : "1";
};

// =========================================================================
// 1. GENERATE SURAT DARI TEMPLATE WORD -> KONVERSI PDF -> SIMPAN DB & DISK
// =========================================================================
const generateSuratKontrakService = async (kontrak_id, forceRegenerate = false) => {
  // 1. Ambil detail data TERBARU dari database
  const data = await getDetailKontrakUntukSurat(kontrak_id);

  // Bersihkan nama penghuni untuk format nama file
  const namaPenghuniSanitised = (data.nama_penghuni || "Penghuni").replace(/[^a-zA-Z0-9]/g, "_");

  const targetDir = path.join(
    __dirname,
    `../../uploads/kontrak/${kontrak_id}/generate`
  );
  ensureDirExists(targetDir);

  // 2. Format Nama File PDF Baru dengan UUID Unik
  const shortUuid = crypto.randomBytes(4).toString("hex");
  const namaFilePdf = `Surat_Perjanjian_${namaPenghuniSanitised}_Kontrak_${kontrak_id}_${shortUuid}.pdf`;
  const pdfPath = path.join(targetDir, namaFilePdf);
  const relativePath = `uploads/kontrak/${kontrak_id}/generate/${namaFilePdf}`;

  // 3. Baca & Render Template Word dengan Data Penghuni Terbaru
  const templatePath = path.join(
    __dirname,
    "../../templates/surat/Surat_Perjanjian_Sewa_Kos.docx"
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error("File template Surat_Perjanjian_Sewa_Kos.docx tidak ditemukan.");
  }

  const content = fs.readFileSync(templatePath);
  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "-",
    delimiters: {
      start: "{{",
      end: "}}",
    },
  });

  const tglPerjanjian = data.tanggal_perjanjian ? new Date(data.tanggal_perjanjian) : new Date();
  const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const namaBulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  doc.render({
    KONTRAK_ID: data.kontrak_id,
    NAMA_PENGHUNI: data.nama_penghuni || "-",
    Nama_Penyewa: data.nama_penghuni || "-",
    NIK: data.nik || "-",
    GENDER: data.gender || "-",
    TEMPAT_LAHIR: data.tempat_lahir || "-",
    TANGGAL_LAHIR: formatTanggalIndo(data.tanggal_lahir),
    ALAMAT_ASAL: data.alamat_asal || "-",
    Alamat: data.alamat_asal || "-",
    NO_HP: data.no_hp || "-",
    No_HP: data.no_hp || "-",
    PEKERJAAN: data.pekerjaan || "-",
    Pekerjaan: data.pekerjaan || "-",
    NOMOR_KAMAR: data.nomor_kamar || "-",
    No_Kamar: data.nomor_kamar || "-",
    TIPE_KAMAR: data.tipe_kamar || "-",
    HARGA_SEWA: formatRupiah(data.harga_sewa),
    Harga_Sewa: formatRupiah(data.harga_sewa),
    DEPOSIT: formatRupiah(data.deposit),
    Deposit: formatRupiah(data.deposit),
    TANGGAL_PERJANJIAN: formatTanggalIndo(data.tanggal_perjanjian),
    TANGGAL_MULAI: formatTanggalIndo(data.tanggal_mulai),
    Tanggal_Mulai: formatTanggalIndo(data.tanggal_mulai),
    TANGGAL_BERAKHIR: formatTanggalIndo(data.tanggal_berakhir),
    Tanggal_Selesai: formatTanggalIndo(data.tanggal_berakhir),
    Durasi_Sewa: hitungDurasiBulan(data.tanggal_mulai, data.tanggal_berakhir),
    Hari_surat_terisi: namaHari[tglPerjanjian.getDay()],
    Tanggal_surat_terisi: String(tglPerjanjian.getDate()),
    Bulan_surat_terisi: namaBulan[tglPerjanjian.getMonth()],
    Tahun_surat_terisi: String(tglPerjanjian.getFullYear()),
    Denda_per_hari: formatRupiah(50000),
  });

  const buf = doc.getZip().generate({ type: "nodebuffer" });
  const tempDocxPath = path.join(targetDir, `temp_${kontrak_id}.docx`);
  fs.writeFileSync(tempDocxPath, buf);

  // 4. Konversi ke PDF via LibreOffice CLI
  const sofficeExe = getLibreOfficeExecutable();
  const command = `${sofficeExe} --headless --convert-to pdf "${tempDocxPath}" --outdir "${targetDir}"`;

  try {
    await execAsync(command);
  } catch (err) {
    throw new Error(`Gagal konversi PDF: ${err.message}`);
  }

  const tempPdfGenerated = path.join(targetDir, `temp_${kontrak_id}.pdf`);
  if (fs.existsSync(tempPdfGenerated)) {
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    fs.renameSync(tempPdfGenerated, pdfPath);
  }

  if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);

  // 5. SELALU INSERT RECORD BARU KE DATABASE (Supaya tercatat di History Berkas)
  const dbResult = await pool.query(
    `INSERT INTO dokumen_kontrak (kontrak_id, tipe_dokumen, nama_file, path_file)
     VALUES ($1, 'GENERATE', $2, $3) RETURNING *`,
    [kontrak_id, namaFilePdf, relativePath]
  );

  return { ...dbResult.rows[0], fullPath: pdfPath };
};

// =========================================================================
// 2. SIMPAN HASIL UPLOAD SURAT SIGNED (TTD BASAH)
// =========================================================================
const simpanUploadSuratService = async (kontrak_id, file) => {
  if (!file) throw new Error("File surat wajib diunggah");

  const namaFileAsli = file.originalname || file.filename;
  const namaFileDisk = file.filename;
  const relativePath = `uploads/kontrak/${kontrak_id}/signed/${namaFileDisk}`;

  const dbResult = await pool.query(
    `INSERT INTO dokumen_kontrak (kontrak_id, tipe_dokumen, nama_file, path_file)
     VALUES ($1, 'UPLOAD', $2, $3) RETURNING *`,
    [kontrak_id, namaFileAsli, relativePath]
  );

  return dbResult.rows[0];
};

// =========================================================================
// 3. AMBIL DOKUMEN PER KONTRAK
// =========================================================================
const getDokumenByKontrakIdService = async (kontrak_id) => {
  const result = await pool.query(
    `SELECT * FROM dokumen_kontrak WHERE kontrak_id = $1 ORDER BY id DESC`,
    [kontrak_id]
  );
  return result.rows;
};

// =========================================================================
// 4. AMBIL RIWAYAT SURAT PER PENGHUNI (SELURUH DOKUMEN KONTRAK LAMA & BARU)
// =========================================================================
const getRiwayatSuratByPenghuniService = async (penghuni_id) => {
  const result = await pool.query(
    `SELECT 
        dk.id AS dokumen_id,
        dk.kontrak_id,
        dk.tipe_dokumen,
        dk.nama_file,
        dk.path_file,
        dk.created_at AS tanggal_dokumen,
        k.nomor_kamar,
        c.tanggal_perjanjian,
        c.tanggal_mulai,
        c.tanggal_berakhir,
        c.tanggal_keluar
     FROM dokumen_kontrak dk
     JOIN kontrak c ON c.id = dk.kontrak_id
     JOIN kamar k ON k.id = c.kamar_id
     WHERE c.penghuni_id = $1
     ORDER BY dk.id DESC`,
    [penghuni_id]
  );
  return result.rows;
};

module.exports = {
  generateSuratKontrakService,
  simpanUploadSuratService,
  getDokumenByKontrakIdService,
  getRiwayatSuratByPenghuniService,
};