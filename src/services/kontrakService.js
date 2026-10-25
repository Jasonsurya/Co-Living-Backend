const pool = require("../config/database");

// Ambil semua daftar kontrak
const getAllKontrak = async () => {
  const result = await pool.query(`
    SELECT *
    FROM kontrak
    ORDER BY id ASC
  `);
  return result.rows;
};

// Ambil semua kontrak yang sedang aktif
const getKontrakAktif = async () => {
  const result = await pool.query(`
    SELECT
      c.id AS kontrak_id,
      c.penghuni_id,
      p.nama AS nama_penghuni,
      c.kamar_id,
      k.nomor_kamar,
      k.tipe,
      k.harga_sewa,
      k.denda_per_hari,
      c.tanggal_perjanjian,
      c.tanggal_mulai,
      c.tanggal_berakhir,
      c.deposit,
      COALESCE(c.status_deposit, 'ACTIVE') AS status_deposit
    FROM kontrak c
    JOIN penghuni p ON p.id = c.penghuni_id
    JOIN kamar k ON k.id = c.kamar_id
    WHERE c.tanggal_keluar IS NULL
      AND k.status = 'OCCUPIED'
    ORDER BY k.id ASC
  `);
  return result.rows;
};

// Buat kontrak sewa baru
const createKontrak = async ({
  penghuni_id,
  kamar_id,
  tanggal_perjanjian,
  tanggal_mulai,
  tanggal_berakhir,
  deposit,
}) => {
  const kamarResult = await pool.query(
    `SELECT harga_sewa FROM kamar WHERE id = $1`,
    [kamar_id]
  );

  if (kamarResult.rows.length === 0) {
    throw new Error("Kamar tidak ditemukan");
  }

  const hargaSewa = Number(kamarResult.rows[0].harga_sewa);
  const depositDefault = hargaSewa * 0.5;

  const depositFinal =
    deposit !== undefined && deposit !== null && deposit !== ""
      ? Number(deposit)
      : depositDefault;

  if (depositFinal <= 0) {
    throw new Error("Deposit harus lebih dari 0");
  }

  const result = await pool.query(
    `
    INSERT INTO kontrak (
      penghuni_id,
      kamar_id,
      tanggal_perjanjian,
      tanggal_mulai,
      tanggal_berakhir,
      deposit,
      status_deposit
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
    RETURNING *
    `,
    [
      penghuni_id,
      kamar_id,
      tanggal_perjanjian,
      tanggal_mulai,
      tanggal_berakhir,
      depositFinal,
    ]
  );

  return result.rows[0];
};

// Perpanjang kontrak sewa
const perpanjangKontrak = async ({
  kamar_id,
  tanggal_perjanjian,
  tanggal_mulai,
  tanggal_berakhir,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const kontrakAktifResult = await client.query(
      `
      SELECT 
        c.id AS kontrak_id, 
        c.penghuni_id, 
        c.kamar_id, 
        c.deposit
      FROM kontrak c
      JOIN kamar k ON k.id = c.kamar_id
      WHERE c.kamar_id = $1
        AND k.status = 'OCCUPIED'
        AND c.tanggal_keluar IS NULL
      ORDER BY c.tanggal_mulai DESC
      LIMIT 1
      FOR UPDATE OF c
      `,
      [kamar_id]
    );

    if (kontrakAktifResult.rows.length === 0) {
      throw new Error("Tidak ada penghuni aktif di kamar ini untuk diperpanjang");
    }

    const kontrakLama = kontrakAktifResult.rows[0];

    const saldoLamaResult = await client.query(
      `SELECT saldo FROM saldo_deposit WHERE kontrak_id = $1`,
      [kontrakLama.kontrak_id]
    );

    const saldoDepositLama =
      saldoLamaResult.rows.length > 0
        ? Number(saldoLamaResult.rows[0].saldo)
        : Number(kontrakLama.deposit || 0);

    await client.query(
      `
      UPDATE kontrak
      SET tanggal_keluar = $1,
          status_deposit = 'TRANSFERRED'
      WHERE id = $2
      `,
      [tanggal_mulai, kontrakLama.kontrak_id]
    );

    await client.query(
      `
      UPDATE saldo_deposit
      SET saldo = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE kontrak_id = $1
      `,
      [kontrakLama.kontrak_id]
    );

    const kontrakBaruResult = await client.query(
      `
      INSERT INTO kontrak (
        penghuni_id,
        kamar_id,
        tanggal_perjanjian,
        tanggal_mulai,
        tanggal_berakhir,
        deposit,
        status_deposit
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
      RETURNING *
      `,
      [
        kontrakLama.penghuni_id,
        kontrakLama.kamar_id,
        tanggal_perjanjian,
        tanggal_mulai,
        tanggal_berakhir,
        kontrakLama.deposit || 0,
      ]
    );

    const kontrakBaru = kontrakBaruResult.rows[0];

    await client.query(
      `
      INSERT INTO saldo_deposit (kontrak_id, saldo)
      VALUES ($1, $2)
      ON CONFLICT (kontrak_id) 
      DO UPDATE SET saldo = EXCLUDED.saldo
      `,
      [kontrakBaru.id, saldoDepositLama]
    );

    await client.query(
      `
      INSERT INTO riwayat_deposit (kontrak_id, jenis, nominal, keterangan)
      VALUES ($1, 'DEPOSIT_AWAL', $2, $3)
      `,
      [
        kontrakBaru.id,
        saldoDepositLama,
        `Penerusan saldo deposit dari Kontrak ID #${kontrakLama.kontrak_id}`,
      ]
    );

    await client.query(
      `
      INSERT INTO dokumen_kontrak (kontrak_id, tipe_dokumen, nama_file, path_file)
      SELECT $1, tipe_dokumen, nama_file, path_file
      FROM dokumen_kontrak
      WHERE kontrak_id = $2
      `,
      [kontrakBaru.id, kontrakLama.kontrak_id]
    );

    await client.query("COMMIT");
    return kontrakBaru;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Keluar kamar (checkout)
const keluarKamar = async (kamarId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const kontrakAktifResult = await client.query(
      `
      SELECT c.id, c.penghuni_id, c.kamar_id
      FROM kontrak c
      JOIN kamar k ON k.id = c.kamar_id
      WHERE c.kamar_id = $1
        AND k.status = 'OCCUPIED'
        AND c.tanggal_keluar IS NULL
      ORDER BY c.tanggal_mulai DESC
      LIMIT 1
      FOR UPDATE OF c
      `,
      [kamarId]
    );

    if (kontrakAktifResult.rows.length === 0) {
      throw new Error("Tidak ada penghuni aktif di kamar ini");
    }

    const kontrakAktif = kontrakAktifResult.rows[0];

    const kontrakUpdateResult = await client.query(
      `UPDATE kontrak
       SET tanggal_keluar = CURRENT_DATE
       WHERE id = $1
       RETURNING *`,
      [kontrakAktif.id]
    );

    const kamarUpdateResult = await client.query(
      `UPDATE kamar
       SET status = 'AVAILABLE',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [kamarId]
    );

    await client.query("COMMIT");

    return {
      kontrak: kontrakUpdateResult.rows[0],
      kamar: kamarUpdateResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Ambil detail data kontrak lengkap
const getDetailKontrakUntukSurat = async (kontrakId) => {
  const result = await pool.query(
    `
    SELECT 
      c.id AS kontrak_id,
      c.tanggal_perjanjian,
      c.tanggal_mulai,
      c.tanggal_berakhir,
      c.deposit,
      p.nama AS nama_penghuni,
      p.nik,
      p.gender,
      p.tempat_lahir,
      p.tanggal_lahir,
      p.alamat AS alamat_asal,
      p.no_hp,
      p.pekerjaan,
      k.nomor_kamar,
      k.harga_sewa,
      k.tipe AS tipe_kamar
    FROM kontrak c
    JOIN penghuni p ON p.id = c.penghuni_id
    JOIN kamar k ON k.id = c.kamar_id
    WHERE c.id = $1
    `,
    [kontrakId]
  );

  if (result.rows.length === 0) {
    throw new Error("Data kontrak tidak ditemukan");
  }

  return result.rows[0];
};

module.exports = {
  getAllKontrak,
  getKontrakAktif,
  createKontrak,
  perpanjangKontrak,
  keluarKamar,
  getDetailKontrakUntukSurat,
};