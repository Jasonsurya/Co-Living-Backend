const pool = require("../config/database");

const getAllPenghuni = async () => {
  const result = await pool.query(`
    SELECT 
      p.*,
      COALESCE(
        (
          SELECT json_agg(kd ORDER BY kd.id ASC)
          FROM kontak_darurat kd
          WHERE kd.penghuni_id = p.id
        ), '[]'::json
      ) AS kontak_darurat
    FROM penghuni p
    ORDER BY p.id ASC
  `);
  return result.rows;
};

// PERBAIKAN: Menambahkan transaksi SQL untuk menyimpan kontak_darurat
const createPenghuni = async ({
  nama,
  nik,
  gender,
  tempat_lahir,
  tanggal_lahir,
  alamat,
  no_hp,
  pekerjaan,
  foto_ktp,
  foto_diri,
  kontak_darurat,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const penghuniResult = await client.query(
      `
      INSERT INTO penghuni (
        nama, nik, gender, tempat_lahir, tanggal_lahir,
        alamat, no_hp, pekerjaan, foto_ktp, foto_diri
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        nama,
        nik,
        gender,
        tempat_lahir,
        tanggal_lahir,
        alamat,
        no_hp,
        pekerjaan,
        foto_ktp,
        foto_diri,
      ]
    );

    const newPenghuni = penghuniResult.rows[0];

    // Handle jika kontak_darurat dikirim berupa String JSON
    let listKontak = kontak_darurat;
    if (typeof listKontak === "string") {
      try {
        listKontak = JSON.parse(listKontak);
      } catch {
        listKontak = [];
      }
    }

    if (Array.isArray(listKontak) && listKontak.length > 0) {
      for (const kontak of listKontak) {
        if (kontak.nama) {
          await client.query(
            `
            INSERT INTO kontak_darurat (penghuni_id, nama, hubungan, no_hp)
            VALUES ($1, $2, $3, $4)
            `,
            [newPenghuni.id, kontak.nama, kontak.hubungan, kontak.no_hp]
          );
        }
      }
    }

    await client.query("COMMIT");
    return newPenghuni;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updatePenghuni = async (id, payload) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT foto_ktp, foto_diri FROM penghuni WHERE id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const existingPenghuni = existingResult.rows[0];

    const finalFotoKtp = payload.foto_ktp || existingPenghuni.foto_ktp;
    const finalFotoDiri = payload.foto_diri || existingPenghuni.foto_diri;

    const penghuniResult = await client.query(
      `
      UPDATE penghuni
      SET
        nama = $1, nik = $2, gender = $3, tempat_lahir = $4,
        tanggal_lahir = $5, alamat = $6, no_hp = $7,
        pekerjaan = $8, foto_ktp = $9, foto_diri = $10
      WHERE id = $11
      RETURNING *
      `,
      [
        payload.nama,
        payload.nik,
        payload.gender,
        payload.tempat_lahir,
        payload.tanggal_lahir,
        payload.alamat,
        payload.no_hp,
        payload.pekerjaan,
        finalFotoKtp,
        finalFotoDiri,
        id,
      ]
    );

    await client.query(`DELETE FROM kontak_darurat WHERE penghuni_id = $1`, [
      id,
    ]);

    let listKontak = payload.kontak_darurat;
    if (typeof listKontak === "string") {
      try {
        listKontak = JSON.parse(listKontak);
      } catch {
        listKontak = [];
      }
    }

    if (Array.isArray(listKontak)) {
      for (const kontak of listKontak) {
        if (kontak.nama) {
          await client.query(
            `
            INSERT INTO kontak_darurat (penghuni_id, nama, hubungan, no_hp)
            VALUES ($1, $2, $3, $4)
            `,
            [id, kontak.nama, kontak.hubungan, kontak.no_hp]
          );
        }
      }
    }

    await client.query("COMMIT");
    return penghuniResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getPenghuniByKamarId = async (kamarId) => {
  const result = await pool.query(
    `
    SELECT
      p.id, p.nama, p.nik, p.gender, p.tempat_lahir, p.tanggal_lahir,
      p.alamat, p.no_hp, p.pekerjaan, p.foto_ktp, p.foto_diri,
      k.id AS kamar_id, k.nomor_kamar,
      c.id AS kontrak_id, c.tanggal_perjanjian, c.tanggal_mulai, c.tanggal_berakhir,
      c.status_deposit
    FROM penghuni p
    JOIN kontrak c ON c.penghuni_id = p.id
    JOIN kamar k ON k.id = c.kamar_id
    WHERE k.id = $1 AND c.tanggal_keluar IS NULL
    ORDER BY c.tanggal_mulai DESC, c.id DESC
    LIMIT 1
    `,
    [kamarId]
  );

  if (result.rows.length === 0) {
    throw new Error("Penghuni kamar tidak ditemukan");
  }

  const penghuni = result.rows[0];

  const kontakResult = await pool.query(
    `SELECT id, nama, hubungan, no_hp FROM kontak_darurat WHERE penghuni_id = $1 ORDER BY id ASC`,
    [penghuni.id]
  );

  // FIX: Mengganti nama properti dari kontrak_darurat menjadi kontak_darurat
  return {
    ...penghuni,
    kontak_darurat: kontakResult.rows,
  };
};

// FIX UTAMA: Menambahkan penarikan data kontak_darurat dan biodata lengkap pada getPenghuniAktif
const getPenghuniAktif = async () => {
  const result = await pool.query(`
    SELECT
      p.id AS penghuni_id,
      p.nama,
      p.nik,
      p.gender,
      p.tempat_lahir,
      p.tanggal_lahir,
      p.alamat,
      p.no_hp,
      p.pekerjaan,
      p.foto_ktp,
      p.foto_diri,
      k.id AS kamar_id,
      k.nomor_kamar,
      c.id AS kontrak_id,
      c.tanggal_perjanjian,
      c.tanggal_mulai,
      c.tanggal_berakhir,
      COALESCE(c.status_deposit, 'ACTIVE') AS status_deposit,
      COALESCE(
        (SELECT SUM(rd.nominal) FROM riwayat_deposit rd WHERE rd.kontrak_id = c.id AND rd.jenis = 'DEPOSIT_AWAL'),
        (SELECT SUM(t.nominal) FROM transaksi t JOIN akun a ON a.id = t.akun_id WHERE t.kontrak_id = c.id AND a.kode = '201'),
        (SELECT sd.saldo FROM saldo_deposit sd WHERE sd.kontrak_id = c.id),
        0
      ) AS deposit,
      COALESCE(
        (SELECT SUM(rd.nominal) FROM riwayat_deposit rd WHERE rd.kontrak_id = c.id AND rd.jenis = 'PENGEMBALIAN'),
        (SELECT SUM(t.nominal) FROM transaksi t JOIN akun a ON a.id = t.akun_id WHERE t.kontrak_id = c.id AND a.kode = '202'),
        0
      ) AS pengembalian,
      (
        EXISTS (SELECT 1 FROM riwayat_deposit rd WHERE rd.kontrak_id = c.id AND rd.jenis = 'PENGEMBALIAN')
        OR EXISTS (SELECT 1 FROM transaksi t JOIN akun a ON a.id = t.akun_id WHERE t.kontrak_id = c.id AND a.kode = '202')
      ) AS is_dikembalikan,
      (
        EXISTS (SELECT 1 FROM riwayat_deposit rd WHERE rd.kontrak_id = c.id)
        OR EXISTS (SELECT 1 FROM saldo_deposit sd WHERE sd.kontrak_id = c.id)
      ) AS has_deposit_record,
      COALESCE((
        SELECT SUM(t.nominal)
        FROM transaksi t
        JOIN akun a ON a.id = t.akun_id
        WHERE t.kontrak_id = c.id AND a.kode = '402'
      ), 0) AS denda,
      COALESCE(
        (
          SELECT json_agg(kd ORDER BY kd.id ASC)
          FROM kontak_darurat kd
          WHERE kd.penghuni_id = p.id
        ), '[]'::json
      ) AS kontak_darurat
    FROM penghuni p
    JOIN kontrak c ON c.penghuni_id = p.id
    JOIN kamar k ON k.id = c.kamar_id
    WHERE c.tanggal_keluar IS NULL
    ORDER BY k.id ASC
  `);

  return result.rows;
};

// Di dalam file penghuniModel.js
const getRiwayatPenghuni = async () => {
  try {
    const result = await pool.query(`
      SELECT
        p.id AS penghuni_id,
        p.nama,
        p.nik,
        p.gender,
        p.tempat_lahir,
        p.tanggal_lahir,
        p.alamat,
        p.no_hp,
        p.pekerjaan,
        p.foto_ktp,
        p.foto_diri,
        k.id AS kamar_id,
        k.nomor_kamar,
        c.id AS kontrak_id,
        c.tanggal_perjanjian,
        c.tanggal_mulai,
        c.tanggal_berakhir,
        c.tanggal_keluar,
        COALESCE(c.status_deposit, 'ACTIVE') AS status_deposit,
        COALESCE(
          (SELECT SUM(rd.nominal) FROM riwayat_deposit rd WHERE rd.kontrak_id = c.id AND rd.jenis = 'DEPOSIT_AWAL'),
          (SELECT SUM(t.nominal) FROM transaksi t JOIN akun a ON a.id = t.akun_id WHERE t.kontrak_id = c.id AND a.kode = '201'),
          (SELECT sd.saldo FROM saldo_deposit sd WHERE sd.kontrak_id = c.id),
          0
        ) AS deposit,
        COALESCE(
          (SELECT SUM(rd.nominal) FROM riwayat_deposit rd WHERE rd.kontrak_id = c.id AND rd.jenis = 'PENGEMBALIAN'),
          (SELECT SUM(t.nominal) FROM transaksi t JOIN akun a ON a.id = t.akun_id WHERE t.kontrak_id = c.id AND a.kode = '202'),
          0
        ) AS pengembalian,
        (
          EXISTS (SELECT 1 FROM riwayat_deposit rd WHERE rd.kontrak_id = c.id AND rd.jenis = 'PENGEMBALIAN')
          OR EXISTS (SELECT 1 FROM transaksi t JOIN akun a ON a.id = t.akun_id WHERE t.kontrak_id = c.id AND a.kode = '202')
        ) AS is_dikembalikan,
        (
          EXISTS (SELECT 1 FROM riwayat_deposit rd WHERE rd.kontrak_id = c.id)
          OR EXISTS (SELECT 1 FROM saldo_deposit sd WHERE sd.kontrak_id = c.id)
        ) AS has_deposit_record,
        COALESCE((
          SELECT SUM(t.nominal)
          FROM transaksi t
          JOIN akun a ON a.id = t.akun_id
          WHERE t.kontrak_id = c.id AND a.kode = '402'
        ), 0) AS denda,
        COALESCE(
          (
            SELECT json_agg(kd ORDER BY kd.id ASC)
            FROM kontak_darurat kd
            WHERE kd.penghuni_id = p.id
          ), '[]'::json
        ) AS kontak_darurat
      FROM kontrak c
      JOIN penghuni p ON p.id = c.penghuni_id
      JOIN kamar k ON k.id = c.kamar_id
      WHERE c.tanggal_keluar IS NOT NULL -- FIX: HANYA PENGHUNI YANG SUDAH KELUAR
      ORDER BY c.tanggal_keluar DESC, c.id DESC
    `);

    return result.rows;
  } catch (error) {
    console.error("Error pada getRiwayatPenghuni:", error.message);
    throw error;
  }
};

const getKontrakPengembalianDeposit = async () => {
  const result = await pool.query(`
    SELECT
      c.id AS kontrak_id,
      k.nomor_kamar,
      p.nama AS nama_penghuni,
      COALESCE(sd.saldo, 0) AS sisa_deposit
    FROM kontrak c
    JOIN penghuni p ON p.id = c.penghuni_id
    JOIN kamar k ON k.id = c.kamar_id
    JOIN saldo_deposit sd ON sd.kontrak_id = c.id
    WHERE sd.saldo > 0
      AND (c.status_deposit IS NULL OR c.status_deposit != 'TRANSFERRED')
    ORDER BY k.nomor_kamar ASC, c.id DESC
  `);
  return result.rows;
};

const getDetailRiwayatByKontrakId = async (kontrakId) => {
  const result = await pool.query(
    `
    SELECT
      p.id, p.nama, p.nik, p.gender, p.tempat_lahir, p.tanggal_lahir,
      p.alamat, p.no_hp, p.pekerjaan, p.foto_ktp, p.foto_diri,
      k.id AS kamar_id, k.nomor_kamar,
      c.id AS kontrak_id, c.tanggal_perjanjian, c.tanggal_mulai,
      c.tanggal_berakhir, c.tanggal_keluar, c.status_deposit
    FROM kontrak c
    JOIN penghuni p ON p.id = c.penghuni_id
    JOIN kamar k ON k.id = c.kamar_id
    WHERE c.id = $1
    `,
    [kontrakId]
  );

  if (result.rows.length === 0) {
    throw new Error("Detail penghuni tidak ditemukan");
  }

  const penghuni = result.rows[0];

  const kontakResult = await pool.query(
    `SELECT id, nama, hubungan, no_hp FROM kontak_darurat WHERE penghuni_id = $1 ORDER BY id ASC`,
    [penghuni.id]
  );

  return {
    ...penghuni,
    kontak_darurat: kontakResult.rows,
  };
};

module.exports = {
  getAllPenghuni,
  createPenghuni,
  updatePenghuni,
  getPenghuniByKamarId,
  getRiwayatPenghuni,
  getDetailRiwayatByKontrakId,
  getPenghuniAktif,
  getKontrakPengembalianDeposit,
};