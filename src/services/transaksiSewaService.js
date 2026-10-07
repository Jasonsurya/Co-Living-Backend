const pool = require("../config/database");

const createTransaksiSewa = async (data = {}) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const {
            tanggal,
            kamar_id,
            penghuni_id,
            kontrak_id,
            nominal_sewa,
            include_deposit = false,
            nominal_deposit = 0,
            keterangan = "Pembayaran sewa kamar",
            bukti = null,
        } = data;

        // Pastikan include_deposit menjadi boolean sejati
        const isIncludeDeposit =
            include_deposit === true || include_deposit === "true";

        if (!tanggal) {
            throw new Error("Tanggal transaksi wajib diisi");
        }

        if (!kamar_id) {
            throw new Error("Kamar wajib dipilih");
        }

        if (!penghuni_id) {
            throw new Error("Penghuni wajib dipilih");
        }

        if (!kontrak_id) {
            throw new Error("Kontrak wajib dipilih");
        }

        const nominalSewa = Number(nominal_sewa);

        if (
            !Number.isFinite(nominalSewa) ||
            nominalSewa <= 0
        ) {
            throw new Error(
                "Nominal sewa harus lebih dari 0"
            );
        }

        const nominalDeposit = Number(nominal_deposit);

        if (
            isIncludeDeposit &&
            (
                !Number.isFinite(nominalDeposit) ||
                nominalDeposit <= 0
            )
        ) {
            throw new Error(
                "Nominal deposit harus lebih dari 0"
            );
        }

        const akunSewaResult = await client.query(
            `
            SELECT
                id,
                kode,
                nama,
                jenis,
                aktif
            FROM akun
            WHERE kode = '401'
            `
        );

        if (akunSewaResult.rows.length === 0) {
            throw new Error(
                "Akun 401 Pendapatan Sewa Kamar tidak ditemukan"
            );
        }

        const akunSewa = akunSewaResult.rows[0];

        if (!akunSewa.aktif) {
            throw new Error(
                "Akun 401 Pendapatan Sewa Kamar tidak aktif"
            );
        }

        const akunDepositResult = await client.query(
            `
            SELECT
                id,
                kode,
                nama,
                jenis,
                aktif
            FROM akun
            WHERE kode = '201'
            `
        );

        if (
            isIncludeDeposit &&
            akunDepositResult.rows.length === 0
        ) {
            throw new Error(
                "Akun 201 Deposit Awal tidak ditemukan"
            );
        }

        if (
            isIncludeDeposit &&
            !akunDepositResult.rows[0].aktif
        ) {
            throw new Error(
                "Akun 201 Deposit Awal tidak aktif"
            );
        }

        const kontrakResult = await client.query(
            `
            SELECT
                kontrak.id,
                kontrak.penghuni_id,
                kontrak.kamar_id,
                kamar.nomor_kamar,
                kamar.harga_sewa
            FROM kontrak
            INNER JOIN kamar
                ON kamar.id = kontrak.kamar_id
            WHERE kontrak.id = $1
            FOR UPDATE
            `,
            [kontrak_id]
        );

        if (kontrakResult.rows.length === 0) {
            throw new Error("Kontrak tidak ditemukan");
        }

        const kontrak = kontrakResult.rows[0];

        if (
            Number(kontrak.penghuni_id) !==
            Number(penghuni_id)
        ) {
            throw new Error(
                "Penghuni tidak sesuai dengan kontrak"
            );
        }

        if (
            Number(kontrak.kamar_id) !==
            Number(kamar_id)
        ) {
            throw new Error(
                "Kamar tidak sesuai dengan kontrak"
            );
        }

        const kamarResult = await client.query(
            `
            SELECT
                id,
                status
            FROM kamar
            WHERE id = $1
            FOR UPDATE
            `,
            [kamar_id]
        );

        if (kamarResult.rows.length === 0) {
            throw new Error("Kamar tidak ditemukan");
        }

        if (kamarResult.rows[0].status !== "OCCUPIED") {
            throw new Error(
                "Kamar tidak sedang terisi"
            );
        }

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

        const transaksiSewaResult = await client.query(
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
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                'OPERASIONAL',
                'MASUK'
            )
            RETURNING *
            `,
            [
                tanggal,
                akunSewa.id,
                kamar_id,
                penghuni_id,
                kontrak_id,
                nominalSewa,
                keterangan,
                bukti,
            ]
        );

        let transaksiDeposit = null;
        let saldoDeposit = null;
        let riwayatDeposit = null;

        if (isIncludeDeposit) {
            const akunDeposit = akunDepositResult.rows[0];

            const saldoResult = await client.query(
                `
                SELECT
                    id,
                    kontrak_id,
                    saldo
                FROM saldo_deposit
                WHERE kontrak_id = $1
                FOR UPDATE
                `,
                [kontrak_id]
            );

            if (saldoResult.rows.length > 0) {
                throw new Error(
                    "Deposit awal untuk kontrak ini sudah pernah dicatat"
                );
            }

            const transaksiDepositResult =
                await client.query(
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
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        'DEPOSIT',
                        'MASUK'
                    )
                    RETURNING *
                    `,
                    [
                        tanggal,
                        akunDeposit.id,
                        kamar_id,
                        penghuni_id,
                        kontrak_id,
                        nominalDeposit,
                        `Deposit Pertama Kamar ${kontrak.nomor_kamar}`,
                        bukti,
                    ]
                );

            transaksiDeposit =
                transaksiDepositResult.rows[0];

            const saldoDepositResult =
                await client.query(
                    `
                    INSERT INTO saldo_deposit (
                        kontrak_id,
                        saldo
                    )
                    VALUES ($1, $2)
                    RETURNING *
                    `,
                    [
                        kontrak_id,
                        nominalDeposit,
                    ]
                );

            saldoDeposit = saldoDepositResult.rows[0];

            const riwayatDepositResult =
                await client.query(
                    `
                    INSERT INTO riwayat_deposit (
                        kontrak_id,
                        jenis,
                        nominal,
                        keterangan,
                        transaksi_id
                    )
                    VALUES (
                        $1,
                        'DEPOSIT_AWAL',
                        $2,
                        $3,
                        $4
                    )
                    RETURNING *
                    `,
                    [
                        kontrak_id,
                        nominalDeposit,
                        `Deposit Awal Kamar ${kontrak.nomor_kamar}`,
                        transaksiDeposit.id,
                    ]
                );

            riwayatDeposit =
                riwayatDepositResult.rows[0];
        }

        await client.query("COMMIT");

        return {
            transaksi_sewa: transaksiSewaResult.rows[0],
            transaksi_deposit: transaksiDeposit,
            saldo_deposit: saldoDeposit,
            riwayat_deposit: riwayatDeposit,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    createTransaksiSewa,
};