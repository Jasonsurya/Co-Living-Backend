const pool = require("../config/database");

const getAllKontakDarurat = async () => {
    const result = await pool.query(`
        SELECT *
        FROM kontak_darurat
        ORDER BY id ASC
    `);

    return result.rows;
};

// TAMBAHKAN FUNGSI INI
const getKontakDaruratByPenghuniId = async (penghuni_id) => {
    const result = await pool.query(
        `
        SELECT *
        FROM kontak_darurat
        WHERE penghuni_id = $1
        ORDER BY id ASC
        `,
        [penghuni_id]
    );

    return result.rows;
};

const createKontakDarurat = async ({
    penghuni_id,
    nama,
    hubungan,
    no_hp
}) => {
    const result = await pool.query(
        `
        INSERT INTO kontak_darurat (
            penghuni_id,
            nama,
            hubungan,
            no_hp
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [penghuni_id, nama, hubungan, no_hp]
    );

    return result.rows[0];
};

module.exports = {
    getAllKontakDarurat,
    getKontakDaruratByPenghuniId, // <--- Export fungsi baru ini
    createKontakDarurat
};