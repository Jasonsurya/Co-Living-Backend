const express = require("express");

const {
    getKontakDarurat,
    tambahKontakDarurat
} = require("../controllers/kontakDaruratController");

const router = express.Router();

router.get("/", getKontakDarurat);
router.post("/", tambahKontakDarurat);

module.exports = router;