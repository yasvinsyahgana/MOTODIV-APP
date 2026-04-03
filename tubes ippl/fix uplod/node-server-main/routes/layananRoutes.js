// routes/layananRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/layananController');
const { authReq, adminReq } = require('../middleware/authMiddleWare');

// Rute Publik
router.get('/', controller.getAllLayanan);
router.get('/:id', controller.getLayananId);

// Rute Admin
router.post('/', authReq, adminReq, controller.addLayanan);
router.patch('/:id', authReq, adminReq, controller.updateLayanan);
router.delete('/:id', authReq, adminReq, controller.deleteLayanan);

module.exports = router;