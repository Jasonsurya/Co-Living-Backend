const express = require("express");

const {
    getAkun
} = require("../controllers/akunController");

const router = express.Router();

router.get("/", getAkun);

module.exports = router;