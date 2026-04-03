// routes/ulasanRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/ulasanController');
const { authReq, adminReq } = require('../middleware/authMiddleWare');

// Rute Publik (Get ulasan untuk 1 produk)
router.get('/produk/:idProduk', controller.getUlasanByProduk);
// TODO: Buat rute untuk get ulasan by layanan jika perlu

// Rute Customer (Tambah ulasan)
router.post('/', authReq, controller.addUlasan);

// Rute Admin (Hapus ulasan)
router.delete('/:id', authReq, adminReq, controller.deleteUlasan);

module.exports = router;