const pool = require("../config/database");

const getBukuBesar = async (filter = {}) => {
    const { bulan, tahun } = filter;

    const conditions = [
        "t.jenis_transaksi = 'OPERASIONAL'"
    ];

    const values = [];

    if (bulan) {
        values.push(Number(bulan));
        conditions.push(
            `EXTRACT(MONTH FROM t.tanggal) = $${values.length}`
        );
    }

    if (tahun) {
        values.push(Number(tahun));
        conditions.push(
            `EXTRACT(YEAR FROM t.tanggal) = $${values.length}`
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

        WHERE ${conditions.join(" AND ")}

        ORDER BY
            t.tanggal DESC,
            t.id DESC
        `,
        values
    );

    const totalPendapatan = result.rows
        .filter(
            (transaksi) =>
                transaksi.jenis === "PEMASUKAN"
        )
        .reduce(
            (total, transaksi) =>
                total + Number(transaksi.nominal),
            0
        );

    const totalPengeluaran = result.rows
        .filter(
            (transaksi) =>
                transaksi.jenis === "PENGELUARAN"
        )
        .reduce(
            (total, transaksi) =>
                total + Number(transaksi.nominal),
            0
        );

    const labaBersih =
        totalPendapatan - totalPengeluaran;

    return {
        transaksi: result.rows,

        ringkasan: {
            bulan: bulan ? Number(bulan) : null,
            tahun: tahun ? Number(tahun) : null,
            total_pendapatan: totalPendapatan,
            total_pengeluaran: totalPengeluaran,
            laba_bersih: labaBersih
        }
    };
};

module.exports = {
    getBukuBesar
};