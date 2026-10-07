const pool = require("../config/database");

const getSaldoDepositByKontrakId = async (kontrak_id) => {
  const result = await pool.query(
    `
      SELECT
        id,
        kontrak_id,
        saldo,
        created_at,
        updated_at
      FROM saldo_deposit
      WHERE kontrak_id = $1
    `,
    [kontrak_id]
  );

  if (result.rows.length === 0) {
    throw new Error("Saldo deposit untuk kontrak tidak ditemukan");
  }

  return result.rows[0];
};

// AMBIL RIWAYAT DEPOSIT LENGKAP (Mempertahankan jejak dari awal kontrak penghuni)
const getRiwayatDepositByKontrakId = async (kontrak_id) => {
  // 1. Ambil penghuni_id dan kamar_id berdasarkan kontrak_id yang dipilih
  const kontrakResult = await pool.query(
    `SELECT penghuni_id, kamar_id FROM kontrak WHERE id = $1`,
    [kontrak_id]
  );

  if (kontrakResult.rows.length === 0) {
    throw new Error("Kontrak tidak ditemukan");
  }

  const { penghuni_id, kamar_id } = kontrakResult.rows[0];


  const result = await pool.query(
    `
      SELECT 
        rd.id,
        rd.kontrak_id,
        rd.jenis,
        rd.nominal,
        rd.keterangan,
        rd.transaksi_id,
        rd.jenis_potongan,
        rd.created_at,
        t.bukti AS bukti_foto
      FROM riwayat_deposit rd
      JOIN kontrak c ON c.id = rd.kontrak_id
      LEFT JOIN transaksi t ON t.id = rd.transaksi_id
      WHERE c.penghuni_id = $1 
        AND c.kamar_id = $2
        -- Abaikan catatan log internal transfer agar nominal saldo tidak terhitung ganda
        AND rd.keterangan NOT LIKE 'Penerusan saldo deposit%'

      UNION ALL

      -- Ambil denda tunai dari tabel transaksi yang belum terikat di riwayat_deposit
      SELECT 
        (900000000 + t.id)::BIGINT AS id,
        t.kontrak_id,
        'POTONGAN' AS jenis,
        t.nominal,
        t.keterangan,
        t.id AS transaksi_id,
        'DENDA_TUNAI' AS jenis_potongan,
        COALESCE(t.created_at, (t.tanggal::text || ' 23:59:59')::timestamp) AS created_at,
        t.bukti AS bukti_foto
      FROM transaksi t
      JOIN akun a ON a.id = t.akun_id
      JOIN kontrak c ON c.id = t.kontrak_id
      WHERE c.penghuni_id = $1 
        AND c.kamar_id = $2
        AND a.kode = '402'
        AND t.jenis_transaksi = 'OPERASIONAL'
        AND NOT EXISTS (
          SELECT 1 FROM riwayat_deposit rd2 WHERE rd2.transaksi_id = t.id
        )

      ORDER BY created_at ASC, id ASC
    `,
    [penghuni_id, kamar_id]
  );

  return result.rows;
};

const buatDepositAwal = async ({
  kontrak_id,
  nominal,
  keterangan,
  transaksi_id = null
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (!kontrak_id) {
      throw new Error("Kontrak wajib dipilih");
    }

    const nominalDeposit = Number(nominal);
    if (!Number.isFinite(nominalDeposit) || nominalDeposit <= 0) {
      throw new Error("Nominal deposit harus lebih dari 0");
    }

    const saldoResult = await client.query(
      `
        INSERT INTO saldo_deposit (kontrak_id, saldo)
        VALUES ($1, $2)
        ON CONFLICT (kontrak_id) 
        DO UPDATE SET 
          saldo = saldo_deposit.saldo + EXCLUDED.saldo,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `,
      [kontrak_id, nominalDeposit]
    );

    const riwayatResult = await client.query(
      `
        INSERT INTO riwayat_deposit (
          kontrak_id,
          jenis,
          nominal,
          keterangan,
          transaksi_id,
          created_at
        )
        VALUES ($1, 'DEPOSIT_AWAL', $2, $3, $4, NOW())
        RETURNING *
      `,
      [
        kontrak_id,
        nominalDeposit,
        keterangan || "Deposit awal penghuni",
        transaksi_id
      ]
    );

    await client.query("COMMIT");

    return {
      saldo: saldoResult.rows[0],
      riwayat: riwayatResult.rows[0]
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const potongDeposit = async ({
  kontrak_id,
  nominal,
  keterangan,
  jenis_potongan = null,
  transaksi_id = null
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (!kontrak_id) {
      throw new Error("Kontrak wajib dipilih");
    }

    const nominalPotongan = Number(nominal);
    if (!Number.isFinite(nominalPotongan) || nominalPotongan <= 0) {
      throw new Error("Nominal potongan harus lebih dari 0");
    }

    const saldoResult = await client.query(
      `
        SELECT id, saldo 
        FROM saldo_deposit 
        WHERE kontrak_id = $1 
        FOR UPDATE
      `,
      [kontrak_id]
    );

    if (saldoResult.rows.length === 0) {
      throw new Error("Saldo deposit untuk kontrak tidak ditemukan");
    }

    const saldoSaatIni = Number(saldoResult.rows[0].saldo);
    if (saldoSaatIni < nominalPotongan) {
      throw new Error("Saldo deposit tidak mencukupi untuk pemotongan ini");
    }

    const saldoBaru = saldoSaatIni - nominalPotongan;

    const saldoUpdateResult = await client.query(
      `
        UPDATE saldo_deposit
        SET 
          saldo = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `,
      [saldoBaru, saldoResult.rows[0].id]
    );

    const riwayatResult = await client.query(
      `
        INSERT INTO riwayat_deposit (
          kontrak_id,
          jenis,
          nominal,
          keterangan,
          transaksi_id,
          jenis_potongan,
          created_at
        )
        VALUES ($1, 'POTONGAN', $2, $3, $4, $5, NOW())
        RETURNING *
      `,
      [
        kontrak_id,
        nominalPotongan,
        keterangan || "Potongan deposit",
        transaksi_id,
        jenis_potongan
      ]
    );

    await client.query("COMMIT");

    return {
      saldo: saldoUpdateResult.rows[0],
      riwayat: riwayatResult.rows[0]
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// PROSES DENDA DEPOSIT
const prosesDendaDeposit = async (data = {}) => {
  const {
    kontrak_id,
    nominal,
    keterangan,
    bukti_foto
  } = data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (!kontrak_id) throw new Error("Kontrak wajib dipilih");
    if (nominal === undefined || nominal === null || nominal === "") {
      throw new Error("Nominal denda wajib diisi");
    }

    const nominalDenda = Number(nominal);
    if (!Number.isFinite(nominalDenda) || nominalDenda <= 0) {
      throw new Error("Nominal denda harus lebih dari 0");
    }

    const kontrakResult = await client.query(
      `SELECT id, penghuni_id, kamar_id FROM kontrak WHERE id = $1`,
      [kontrak_id]
    );

    if (kontrakResult.rows.length === 0) {
      throw new Error("Kontrak tidak ditemukan");
    }

    const kontrak = kontrakResult.rows[0];

    const saldoResult = await client.query(
      `SELECT id, kontrak_id, saldo FROM saldo_deposit WHERE kontrak_id = $1 FOR UPDATE`,
      [kontrak_id]
    );

    if (saldoResult.rows.length === 0) {
      throw new Error("Saldo deposit untuk kontrak tidak ditemukan");
    }

    const saldoDeposit = saldoResult.rows[0];
    const saldoSaatIni = Number(saldoDeposit.saldo);

    // Hitung pecahan potongan deposit & denda tunai
    const potonganDeposit = Math.min(nominalDenda, saldoSaatIni);
    const dendaTunai = Math.max(nominalDenda - potonganDeposit, 0);
    const saldoBaru = saldoSaatIni - potonganDeposit;

    let saldoUpdateResult = saldoDeposit;
    if (potonganDeposit > 0) {
      const upRes = await client.query(
        `UPDATE saldo_deposit SET saldo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [saldoBaru, saldoDeposit.id]
      );
      saldoUpdateResult = upRes.rows[0];
    }

    const akunResult = await client.query(
      `SELECT id FROM akun WHERE kode = '402' AND aktif = TRUE`
    );

    if (akunResult.rows.length === 0) {
      throw new Error("Akun denda 402 tidak ditemukan atau tidak aktif");
    }

    const akunDendaId = akunResult.rows[0].id;

    let transaksiPotongan = null;
    let transaksiTunai = null;

    const namaFileBukti = bukti_foto && bukti_foto.length > 0 
      ? bukti_foto.map(f => f.filename || f.path).join(",") 
      : null;

    // 1. Simpan Transaksi Kas Deposit
    if (potonganDeposit > 0) {
      const res = await client.query(
        `
          INSERT INTO transaksi (
            tanggal, akun_id, jenis_transaksi, arah_kas,
            kamar_id, penghuni_id, kontrak_id, nominal, keterangan, bukti
          )
          VALUES (CURRENT_DATE, $1, 'DEPOSIT', 'MASUK', $2, $3, $4, $5, $6, $7)
          RETURNING *
        `,
        [
          akunDendaId,
          kontrak.kamar_id,
          kontrak.penghuni_id,
          kontrak.id,
          potonganDeposit,
          keterangan ? `${keterangan} (Dipotong Deposit)` : "Denda dipotong dari deposit",
          namaFileBukti
        ]
      );
      transaksiPotongan = res.rows[0];
    }

    // 2. Simpan Transaksi Kas Tunai
    if (dendaTunai > 0) {
      const res = await client.query(
        `
          INSERT INTO transaksi (
            tanggal, akun_id, jenis_transaksi, arah_kas,
            kamar_id, penghuni_id, kontrak_id, nominal, keterangan, bukti
          )
          VALUES (CURRENT_DATE, $1, 'OPERASIONAL', 'MASUK', $2, $3, $4, $5, $6, $7)
          RETURNING *
        `,
        [
          akunDendaId,
          kontrak.kamar_id,
          kontrak.penghuni_id,
          kontrak.id,
          dendaTunai,
          keterangan ? `${keterangan} (Dibayar Tunai)` : "Denda tunai (melebihi deposit)",
          namaFileBukti
        ]
      );
      transaksiTunai = res.rows[0];
    }

    // 3. Catat ke Tabel riwayat_deposit (Bagian A: Potongan Deposit)
    let riwayatPotongan = null;
    if (potonganDeposit > 0) {
      const res = await client.query(
        `
          INSERT INTO riwayat_deposit (
            kontrak_id, jenis, nominal, keterangan, transaksi_id, jenis_potongan, created_at
          )
          VALUES ($1, 'POTONGAN', $2, $3, $4, 'DENDA', NOW())
          RETURNING *
        `,
        [
          kontrak_id,
          potonganDeposit,
          keterangan || "Potongan deposit karena denda",
          transaksiPotongan ? transaksiPotongan.id : null
        ]
      );
      riwayatPotongan = res.rows[0];
    }

    // 4. Catat ke Tabel riwayat_deposit (Bagian B: Denda Dibayar Tunai)
    let riwayatTunai = null;
    if (dendaTunai > 0) {
      const res = await client.query(
        `
          INSERT INTO riwayat_deposit (
            kontrak_id, jenis, nominal, keterangan, transaksi_id, jenis_potongan, created_at
          )
          VALUES ($1, 'POTONGAN', $2, $3, $4, 'DENDA_TUNAI', NOW() + INTERVAL '1 millisecond')
          RETURNING *
        `,
        [
          kontrak_id,
          dendaTunai,
          keterangan ? `${keterangan} (Sisa Denda Dibayar Tunai)` : "Denda dibayar tunai",
          transaksiTunai ? transaksiTunai.id : null
        ]
      );
      riwayatTunai = res.rows[0];
    }

    await client.query("COMMIT");

    return {
      saldo: saldoUpdateResult,
      total_denda: nominalDenda,
      potongan_deposit: potonganDeposit,
      denda_tunai: dendaTunai,
      saldo_sebelum: saldoSaatIni,
      saldo_sesudah: saldoBaru,
      transaksi_potongan: transaksiPotongan,
      transaksi_tunai: transaksiTunai,
      riwayat_potongan: riwayatPotongan,
      riwayat_tunai: riwayatTunai
    };

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// PENGEMBALIAN DEPOSIT
const kembalikanDeposit = async ({
  kontrak_id,
  nominal,
  keterangan,
  transaksi_id = null
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (!kontrak_id) {
      throw new Error("Kontrak wajib dipilih");
    }

    // PROTEKSI: Cek apakah kontrak ini statusnya TRANSFERRED (Diperpanjang)
    const kontrakCek = await client.query(
      `SELECT status_deposit FROM kontrak WHERE id = $1`,
      [kontrak_id]
    );

    if (
      kontrakCek.rows.length > 0 &&
      kontrakCek.rows[0].status_deposit === "TRANSFERRED"
    ) {
      throw new Error(
        "Deposit tidak dapat dikembalikan karena sudah diteruskan ke perpanjangan kontrak baru."
      );
    }

    const nominalPengembalian = Number(nominal);
    if (!Number.isFinite(nominalPengembalian) || nominalPengembalian <= 0) {
      throw new Error("Nominal pengembalian harus lebih dari 0");
    }

    const saldoResult = await client.query(
      `
        SELECT id, saldo 
        FROM saldo_deposit 
        WHERE kontrak_id = $1 
        FOR UPDATE
      `,
      [kontrak_id]
    );

    if (saldoResult.rows.length === 0) {
      throw new Error("Saldo deposit untuk kontrak tidak ditemukan");
    }

    const saldoSaatIni = Number(saldoResult.rows[0].saldo);
    if (saldoSaatIni < nominalPengembalian) {
      throw new Error("Saldo deposit tidak mencukupi untuk dikembalikan");
    }

    const saldoBaru = saldoSaatIni - nominalPengembalian;

    const saldoUpdateResult = await client.query(
      `
        UPDATE saldo_deposit
        SET 
          saldo = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `,
      [saldoBaru, saldoResult.rows[0].id]
    );

    const riwayatResult = await client.query(
      `
        INSERT INTO riwayat_deposit (
          kontrak_id,
          jenis,
          nominal,
          keterangan,
          transaksi_id,
          created_at
        )
        VALUES ($1, 'PENGEMBALIAN', $2, $3, $4, NOW())
        RETURNING *
      `,
      [
        kontrak_id,
        nominalPengembalian,
        keterangan || "Pengembalian sisa deposit",
        transaksi_id
      ]
    );

    await client.query("COMMIT");

    return {
      saldo: saldoUpdateResult.rows[0],
      riwayat: riwayatResult.rows[0]
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getSaldoDepositByKontrakId,
  getRiwayatDepositByKontrakId,
  buatDepositAwal,
  potongDeposit,
  prosesDendaDeposit,
  kembalikanDeposit
};