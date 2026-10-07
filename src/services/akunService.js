const pool = require("../config/database");

const getAllAkun = async () => {
    const result = await pool.query(`
        SELECT
            id,
            kode,
            nama,
            jenis,
            aktif
        FROM akun
        WHERE aktif = TRUE
        ORDER BY id ASC
    `);

    return result.rows;
};

module.exports = {
    getAllAkun
};