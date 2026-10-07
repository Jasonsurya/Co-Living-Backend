const express = require("express");

const {
    getBukuBesarController
} = require("../controllers/bukuBesarController");

const router = express.Router();

router.get("/", getBukuBesarController);

module.exports = router;