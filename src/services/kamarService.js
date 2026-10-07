const pool = require("../config/database");

const getAllKamar = async () => {
    const result = await pool.query(`
        SELECT
            k.*,
            p.nama AS nama_penghuni
        FROM kamar k

        LEFT JOIN LATERAL (
            SELECT
                p.nama
            FROM kontrak c
            JOIN penghuni p
                ON p.id = c.penghuni_id
            WHERE c.kamar_id = k.id
            AND c.tanggal_keluar IS NULL
            ORDER BY c.tanggal_mulai DESC, c.id DESC
            LIMIT 1
        ) p ON true

        ORDER BY k.id ASC
    `);

    return result.rows;
};

const isiKamar = async (kamarId, data) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const kamarResult = await client.query(
            `
            SELECT *
            FROM kamar
            WHERE id = $1
            FOR UPDATE
            `,
            [kamarId]
        );

        if (kamarResult.rows.length === 0) {
            throw new Error("Kamar tidak ditemukan");
        }

        const kamar = kamarResult.rows[0];

        if (kamar.status === "OCCUPIED") {
            throw new Error("Kamar sudah terisi");
        }

        // Normalisasi data: dukung struktur datar (FormData) maupun berjenjang (JSON)
        const penghuniInput = data.penghuni || data;
        const kontrakInput = data.kontrak || data;

        let kontakDaruratInput = data.kontak_darurat;
        if (typeof kontakDaruratInput === "string") {
            try {
                kontakDaruratInput = JSON.parse(kontakDaruratInput);
            } catch {
                kontakDaruratInput = [];
            }
        }
        kontakDaruratInput = Array.isArray(kontakDaruratInput) ? kontakDaruratInput : [];

        const penghuniResult = await client.query(
            `
            INSERT INTO penghuni (
                nama,
                nik,
                gender,
                tempat_lahir,
                tanggal_lahir,
                alamat,
                no_hp,
                pekerjaan,
                foto_ktp,
                foto_diri
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10
            )
            RETURNING *
            `,
            [
                penghuniInput.nama || null,
                penghuniInput.nik || null,
                penghuniInput.gender || "Laki-laki",
                penghuniInput.tempat_lahir || null,
                penghuniInput.tanggal_lahir || null,
                penghuniInput.alamat || null,
                penghuniInput.no_hp || null,
                penghuniInput.pekerjaan || null,
                penghuniInput.foto_ktp || null,
                penghuniInput.foto_diri || null
            ]
        );

        const penghuni = penghuniResult.rows[0];

        for (const kontak of kontakDaruratInput) {
            await client.query(
                `
                INSERT INTO kontak_darurat (
                    penghuni_id,
                    nama,
                    hubungan,
                    no_hp
                )
                VALUES ($1, $2, $3, $4)
                `,
                [
                    penghuni.id,
                    kontak.nama || "",
                    kontak.hubungan || "",
                    kontak.no_hp || ""
                ]
            );
        }

        const kontrakResult = await client.query(
            `
            INSERT INTO kontrak (
                penghuni_id,
                kamar_id,
                tanggal_perjanjian,
                tanggal_mulai,
                tanggal_berakhir
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [
                penghuni.id,
                kamarId,
                kontrakInput.tanggal_perjanjian || null,
                kontrakInput.tanggal_mulai || null,
                kontrakInput.tanggal_berakhir || null
            ]
        );

        const kontrak = kontrakResult.rows[0];

        const kamarUpdateResult = await client.query(
            `
            UPDATE kamar
            SET
                status = 'OCCUPIED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
            `,
            [kamarId]
        );

        const kamarUpdated = kamarUpdateResult.rows[0];

        await client.query("COMMIT");

        return {
            kamar: kamarUpdated,
            penghuni,
            kontrak
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
};

module.exports = {
    getAllKamar,
    isiKamar
};