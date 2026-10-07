const express = require("express");

const {
    getKasHarianController
} = require("../controllers/kasHarianController");

const router = express.Router();

router.get("/", getKasHarianController);

module.exports = router;