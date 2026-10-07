const pool = require("../config/database");

const getKasHarian = async (filter = {}) => {
    const {
        bulan,
        tahun,
        kode,
        arah
    } = filter;

    let bulanFilter = null;
    let tahunFilter = null;

    if (bulan !== undefined || tahun !== undefined) {
        if (bulan === undefined || tahun === undefined) {
            const error = new Error(
                "Filter bulan dan tahun harus digunakan bersamaan"
            );

            error.statusCode = 400;
            throw error;
        }

        bulanFilter = Number(bulan);
        tahunFilter = Number(tahun);

        if (
            !Number.isInteger(bulanFilter) ||
            bulanFilter < 1 ||
            bulanFilter > 12
        ) {
            const error = new Error(
                "Bulan harus berupa angka 1 sampai 12"
            );

            error.statusCode = 400;
            throw error;
        }

        if (
            !Number.isInteger(tahunFilter) ||
            tahunFilter < 1 ||
            String(tahunFilter).length !== 4
        ) {
            const error = new Error(
                "Tahun harus berupa 4 digit"
            );

            error.statusCode = 400;
            throw error;
        }
    }

    let arahFilter = null;

    if (arah !== undefined) {
        if (
            arah !== "MASUK" &&
            arah !== "KELUAR"
        ) {
            const error = new Error(
                "Arah kas harus MASUK atau KELUAR"
            );

            error.statusCode = 400;
            throw error;
        }

        arahFilter = arah;
    }

    let kodeFilter = null;

    if (kode !== undefined) {
        kodeFilter = kode
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item !== "");

        if (kodeFilter.length === 0) {
            const error = new Error(
                "Kode filter tidak boleh kosong"
            );

            error.statusCode = 400;
            throw error;
        }
    }

    let periodeWhere = "";
    let periodeParams = [];

    if (bulanFilter !== null && tahunFilter !== null) {
        periodeWhere = `
            WHERE
                t.tanggal >= make_date($1, $2, 1)
                AND
                t.tanggal < (
                    make_date($1, $2, 1)
                    + INTERVAL '1 month'
                )::date
        `;

        periodeParams = [
            tahunFilter,
            bulanFilter
        ];
    }

    let saldoAwal = 0;

    if (bulanFilter !== null && tahunFilter !== null) {
        const saldoAwalResult = await pool.query(
            `
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN arah_kas = 'MASUK'
                                THEN nominal
                            WHEN arah_kas = 'KELUAR'
                                THEN -nominal
                            ELSE 0
                        END
                    ),
                    0
                ) AS saldo_awal

            FROM transaksi

            WHERE tanggal < make_date($1, $2, 1)
            `,
            [
                tahunFilter,
                bulanFilter
            ]
        );

        saldoAwal = Number(
            saldoAwalResult.rows[0].saldo_awal
        );
    }

    const result = await pool.query(
        `
        SELECT
            t.id,
            t.tanggal,

            a.id AS akun_id,
            a.kode,
            a.nama AS kategori,
            a.jenis,

            t.jenis_transaksi,
            t.arah_kas,

            t.kamar_id,
            k.nomor_kamar,

            t.penghuni_id,
            p.nama AS nama_penghuni,

            t.kontrak_id,

            t.nominal,
            t.keterangan,
            t.bukti,

            t.created_at,
            t.updated_at

        FROM transaksi t

        JOIN akun a
            ON a.id = t.akun_id

        LEFT JOIN kamar k
            ON k.id = t.kamar_id

        LEFT JOIN penghuni p
            ON p.id = t.penghuni_id

        ${periodeWhere}

        ORDER BY
            t.tanggal ASC,
            t.id ASC
        `,
        periodeParams
    );

    let saldoBerjalan = saldoAwal;

    const semuaTransaksi = result.rows.map((transaksi) => {
        const nominal = Number(transaksi.nominal);

        if (transaksi.arah_kas === "MASUK") {
            saldoBerjalan += nominal;
        }

        if (transaksi.arah_kas === "KELUAR") {
            saldoBerjalan -= nominal;
        }

        return {
            ...transaksi,
            saldo_berjalan: saldoBerjalan
        };
    });

    let transaksiTampil = semuaTransaksi;

    if (arahFilter !== null) {
        transaksiTampil = transaksiTampil.filter(
            (transaksi) =>
                transaksi.arah_kas === arahFilter
        );
    }

    if (kodeFilter !== null) {
        transaksiTampil = transaksiTampil.filter(
            (transaksi) =>
                kodeFilter.includes(transaksi.kode)
        );
    }

    const totalMasuk = transaksiTampil
        .filter(
            (transaksi) =>
                transaksi.arah_kas === "MASUK"
        )
        .reduce(
            (total, transaksi) =>
                total + Number(transaksi.nominal),
            0
        );

    const totalKeluar = transaksiTampil
        .filter(
            (transaksi) =>
                transaksi.arah_kas === "KELUAR"
        )
        .reduce(
            (total, transaksi) =>
                total + Number(transaksi.nominal),
            0
        );

    const saldoAkhir = saldoBerjalan;

    transaksiTampil.reverse();

    return {
        transaksi: transaksiTampil,

        ringkasan: {
            bulan: bulanFilter,
            tahun: tahunFilter,

            saldo_awal: saldoAwal,

            total_masuk: totalMasuk,
            total_keluar: totalKeluar,

            saldo_akhir: saldoAkhir,

            saldo_kas: saldoAkhir
        },

        filter: {
            arah: arahFilter,
            kode: kodeFilter
        }
    };
};

module.exports = {
    getKasHarian
};