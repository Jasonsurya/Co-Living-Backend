
const { Pool, types } = require("pg");
require("dotenv").config();

types.setTypeParser(1082, (val) => val);

console.log(
"DATABASE_URL tersedia:",
Boolean(process.env.DATABASE_URL)
);

console.log(
"DB_USER tersedia:",
Boolean(process.env.DB_USER)
);

const pool = new Pool(
process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
        rejectUnauthorized: false,
        },
    }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    }
);

module.exports = pool;
