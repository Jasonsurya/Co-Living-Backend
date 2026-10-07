const pool = require("../config/database");

/**
 * Mengambil semua data transaksi kas harian beserta relasi akun, kamar, dan penghuni.
 */
const getAllTransaksi = async () => {
    const result = await pool.query(`
        SELECT
            transaksi.id,
            transaksi.tanggal,
            transaksi.akun_id,
            transaksi.kamar_id,
            transaksi.penghuni_id,
            transaksi.kontrak_id,
            transaksi.nominal,
            transaksi.keterangan,
            transaksi.bukti,
            transaksi.jenis_transaksi,
            transaksi.arah_kas,

            akun.kode,
            akun.nama AS kategori,

            kamar.nomor_kamar,

            penghuni.nama AS nama_penghuni

        FROM transaksi

        LEFT JOIN akun
            ON akun.id = transaksi.akun_id

        LEFT JOIN kamar
            ON kamar.id = transaksi.kamar_id

        LEFT JOIN penghuni
            ON penghuni.id = transaksi.penghuni_id

        ORDER BY
            transaksi.tanggal DESC,
            transaksi.id DESC
    `);

    return result.rows;
};

/**
 * Mengambil data sewa yang sedang aktif untuk kebutuhan Dashboard & Monitoring Pembayaran.
 */
const getDataSewaAktif = async () => {
    const result = await pool.query(`
        SELECT
            kontrak.id AS kontrak_id,
            kontrak.penghuni_id,
            kontrak.kamar_id,
            kontrak.tanggal_mulai,
            -- JIKA BELUM ADA TRANSAKSI SEWA (KODE 401), JATUH TEMPO AWAL ADALAH TANGGAL MULAI KONTRAK
            CASE 
                WHEN NOT EXISTS (
                    SELECT 1 FROM transaksi t
                    JOIN akun a ON a.id = t.akun_id
                    WHERE t.kontrak_id = kontrak.id AND a.kode = '401'
                ) THEN kontrak.tanggal_mulai
                ELSE kontrak.tanggal_berakhir
            END AS tanggal_berakhir,
            
            kontrak.tanggal_keluar AS batas_akhir_kontrak,

            penghuni.nama AS nama_penghuni,
            penghuni.no_hp,

            kamar.nomor_kamar,
            kamar.harga_sewa,

            -- Menghitung selisih hari dengan tanggal hari ini untuk penentuan status di Dashboard
            (
                CASE 
                    WHEN NOT EXISTS (
                        SELECT 1 FROM transaksi t
                        JOIN akun a ON a.id = t.akun_id
                        WHERE t.kontrak_id = kontrak.id AND a.kode = '401'
                    ) THEN kontrak.tanggal_mulai
                    ELSE kontrak.tanggal_berakhir
                END::date - CURRENT_DATE
            ) AS sisa_hari

        FROM kontrak

        INNER JOIN penghuni
            ON penghuni.id = kontrak.penghuni_id

        INNER JOIN kamar
            ON kamar.id = kontrak.kamar_id

        WHERE
            kontrak.tanggal_keluar IS NULL
            AND kamar.status = 'OCCUPIED'

        ORDER BY
            CAST(REGEXP_REPLACE(kamar.nomor_kamar, '\\D', '', 'g') AS INTEGER) ASC,
            kamar.nomor_kamar ASC
    `);

    return result.rows;
};

/**
 * Mengambil data kontrak non-aktif yang masih memiliki sisa deposit.
 */
const getDataKontrakDeposit = async () => {
    const result = await pool.query(`
        SELECT 
            c.id AS kontrak_id,
            c.penghuni_id,
            c.kamar_id,
            p.nama AS nama_penghuni,
            k.nomor_kamar,
            c.tanggal_mulai,
            c.tanggal_keluar,
            COALESCE(sd.saldo, 0) AS sisa_deposit,
            'NON-AKTIF' AS status_penghuni
        FROM kontrak c
        INNER JOIN penghuni p ON p.id = c.penghuni_id
        INNER JOIN kamar k ON k.id = c.kamar_id
        LEFT JOIN saldo_deposit sd ON sd.kontrak_id = c.id
        WHERE 
            c.tanggal_keluar IS NOT NULL
            AND COALESCE(sd.saldo, 0) > 0
        ORDER BY 
            c.tanggal_keluar DESC, 
            k.nomor_kamar ASC
    `);

    return result.rows;
};

/**
 * Membuat transaksi kas harian baru dengan otomatisasi:
 * 1. Akun 401 (Sewa): Memajukan tanggal_berakhir kontrak +1 bulan (maksimal sesuai masa kontrak)
 * 2. Akun 201 (Deposit Awal): Menambah saldo deposit & riwayat
 * 3. Akun 202 (Pengembalian Deposit): Memotong saldo deposit & riwayat
 * 4. Akun 402 (Denda): Memotong saldo deposit & riwayat
 */
const createTransaksi = async (data) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        let {
            tanggal,
            akun_id,
            kamar_id = null,
            penghuni_id = null,
            kontrak_id = null,
            nominal,
            keterangan = null,
            bukti = null,
            jenis_transaksi = "OPERASIONAL",
            arah_kas = "MASUK",
        } = data;

        if (!akun_id) {
            throw new Error("akun_id wajib diisi");
        }

        if (!tanggal) {
            throw new Error("Tanggal transaksi wajib diisi");
        }

        const nominalNumber = Number(nominal);

        if (!Number.isFinite(nominalNumber) || nominalNumber <= 0) {
            throw new Error("Nominal transaksi harus lebih dari 0");
        }

        if (!["MASUK", "KELUAR"].includes(arah_kas)) {
            throw new Error("arah_kas harus MASUK atau KELUAR");
        }

        const akunResult = await client.query(
            `
            SELECT
                id,
                kode,
                nama,
                jenis,
                aktif
            FROM akun
            WHERE id = $1
            `,
            [akun_id]
        );

        if (akunResult.rows.length === 0) {
            throw new Error("Akun transaksi tidak ditemukan");
        }

        const akun = akunResult.rows[0];

        if (!akun.aktif) {
            throw new Error("Akun transaksi tidak aktif");
        }

        // VALIDASI KODE AKUN & JENIS TRANSAKSI
        if (
            akun.kode === "201" &&
            (jenis_transaksi !== "DEPOSIT" || arah_kas !== "MASUK")
        ) {
            throw new Error(
                "Akun 201 hanya boleh digunakan untuk DEPOSIT dengan arah kas MASUK"
            );
        }

        if (
            akun.kode === "202" &&
            (jenis_transaksi !== "DEPOSIT" || arah_kas !== "KELUAR")
        ) {
            throw new Error(
                "Akun 202 hanya boleh digunakan untuk DEPOSIT dengan arah kas KELUAR"
            );
        }

        if (
            !["201", "202"].includes(akun.kode) &&
            jenis_transaksi === "DEPOSIT"
        ) {
            throw new Error(
                "Transaksi DEPOSIT hanya boleh menggunakan akun 201 atau 202"
            );
        }

        if (
            !["201", "202"].includes(akun.kode) &&
            akun.jenis === "PEMASUKAN" &&
            arah_kas !== "MASUK"
        ) {
            throw new Error(
                "Akun pemasukan harus menggunakan arah kas MASUK"
            );
        }

        if (
            !["201", "202"].includes(akun.kode) &&
            akun.jenis === "PENGELUARAN" &&
            arah_kas !== "KELUAR"
        ) {
            throw new Error(
                "Akun pengeluaran harus menggunakan arah kas KELUAR"
            );
        }

        if (kamar_id) {
            const kamarResult = await client.query(
                `
                SELECT id
                FROM kamar
                WHERE id = $1
                `,
                [kamar_id]
            );

            if (kamarResult.rows.length === 0) {
                throw new Error("Kamar tidak ditemukan");
            }
        }

        if (penghuni_id) {
            const penghuniResult = await client.query(
                `
                SELECT id
                FROM penghuni
                WHERE id = $1
                `,
                [penghuni_id]
            );

            if (penghuniResult.rows.length === 0) {
                throw new Error("Penghuni tidak ditemukan");
            }
        }

        if (kontrak_id) {
            const kontrakResult = await client.query(
                `
                SELECT
                    id,
                    penghuni_id,
                    kamar_id
                FROM kontrak
                WHERE id = $1
                `,
                [kontrak_id]
            );

            if (kontrakResult.rows.length === 0) {
                throw new Error("Kontrak tidak ditemukan");
            }

            const kontrak = kontrakResult.rows[0];

            if (
                penghuni_id &&
                Number(penghuni_id) !== Number(kontrak.penghuni_id)
            ) {
                throw new Error("Penghuni tidak sesuai dengan kontrak");
            }

            if (
                kamar_id &&
                Number(kamar_id) !== Number(kontrak.kamar_id)
            ) {
                throw new Error("Kamar tidak sesuai dengan kontrak");
            }
        }

        // SIMPAN TRANSAKSI KE TABEL TRANSAKSI
        const result = await client.query(
            `
            INSERT INTO transaksi (
                tanggal,
                akun_id,
                kamar_id,
                penghuni_id,
                kontrak_id,
                nominal,
                keterangan,
                bukti,
                jenis_transaksi,
                arah_kas
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
            )
            RETURNING *
            `,
            [
                tanggal,
                akun_id,
                kamar_id,
                penghuni_id,
                kontrak_id,
                nominalNumber,
                keterangan,
                bukti,
                jenis_transaksi,
                arah_kas,
            ]
        );

        const transaksiBaru = result.rows[0];

        // LOGIKA OTOMATIS PENYESUAIAN KONTRAK, DEPOSIT, & DENDA
        if (kontrak_id) {
            if (akun.kode === "401" && arah_kas === "MASUK") {
                // 1. TRANSAKSI SEWA KAMAR (KODE 401) -> MAJUKAN TANGGAL JATUH TEMPO 1 BULAN
                await client.query(
                    `
                    UPDATE kontrak
                    SET 
                        tanggal_berakhir = tanggal_berakhir + INTERVAL '1 month',
                        updated_at = NOW()
                    WHERE id = $1
                    `,
                    [kontrak_id]
                );
            } else if (akun.kode === "201" && jenis_transaksi === "DEPOSIT") {
                // 2. DEPOSIT MASUK (KODE 201)
                await client.query(
                    `
                    INSERT INTO saldo_deposit (kontrak_id, saldo)
                    VALUES ($1, $2)
                    ON CONFLICT (kontrak_id)
                    DO UPDATE SET saldo = saldo_deposit.saldo + $2
                    `,
                    [kontrak_id, nominalNumber]
                );

                await client.query(
                    `
                    INSERT INTO riwayat_deposit (kontrak_id, jenis, nominal, keterangan, transaksi_id, created_at)
                    VALUES ($1, 'DEPOSIT_AWAL', $2, $3, $4, NOW())
                    `,
                    [kontrak_id, nominalNumber, keterangan || "Deposit Masuk", transaksiBaru.id]
                );
            } else if (akun.kode === "202") {
                // 3. PENGEMBALIAN DEPOSIT (KODE 202)
                await client.query(
                    `
                    UPDATE saldo_deposit
                    SET saldo = GREATEST(0, saldo - $1)
                    WHERE kontrak_id = $2
                    `,
                    [nominalNumber, kontrak_id]
                );

                await client.query(
                    `
                    INSERT INTO riwayat_deposit (kontrak_id, jenis, nominal, keterangan, transaksi_id, created_at)
                    VALUES ($1, 'PENGEMBALIAN', $2, $3, $4, NOW())
                    `,
                    [kontrak_id, nominalNumber, keterangan || "Pengembalian Deposit", transaksiBaru.id]
                );
            } else if (akun.kode === "402") {
                // 4. TRANSAKSI DENDA (KODE 402) -> DIPOTONG DARI DEPOSIT JIKA MASIH ADA
                const sisaSaldoRes = await client.query(
                    `SELECT saldo FROM saldo_deposit WHERE kontrak_id = $1`,
                    [kontrak_id]
                );

                if (sisaSaldoRes.rows.length > 0) {
                    const currentSaldo = Number(sisaSaldoRes.rows[0].saldo || 0);
                    if (currentSaldo > 0) {
                        const potongan = Math.min(currentSaldo, nominalNumber);

                        await client.query(
                            `
                            UPDATE saldo_deposit
                            SET saldo = GREATEST(0, saldo - $1)
                            WHERE kontrak_id = $2
                            `,
                            [potongan, kontrak_id]
                        );

                        await client.query(
                            `
                            INSERT INTO riwayat_deposit (kontrak_id, jenis, jenis_potongan, nominal, keterangan, transaksi_id, created_at)
                            VALUES ($1, 'POTONGAN', 'DENDA', $2, $3, $4, NOW())
                            `,
                            [kontrak_id, potongan, keterangan || "Denda Penghuni", transaksiBaru.id]
                        );
                    }
                }
            }
        }

        await client.query("COMMIT");

        return transaksiBaru;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Menghapus transaksi kas harian berdasarkan ID.
 */
const deleteTransaksi = async (id) => {
    if (!id) {
        throw new Error("ID transaksi wajib diisi");
    }

    const result = await pool.query(
        `
        DELETE FROM transaksi
        WHERE id = $1
        RETURNING *
        `,
        [id]
    );

    if (result.rows.length === 0) {
        throw new Error("Transaksi tidak ditemukan");
    }

    return result.rows[0];
};

module.exports = {
    getAllTransaksi,
    getDataSewaAktif,
    getDataKontrakDeposit,
    createTransaksi,
    deleteTransaksi,
};