// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const { getOrderCounters, getSalesByMonth, getLowStock} = require('../controllers/analyticsController');
const { authReq, adminReq } = require('../middleware/authMiddleWare');

// All analytics require auth + admin
router.use(authReq, adminReq);

router.get('/orders/counters', getOrderCounters);
router.get('/sales/by-month', getSalesByMonth);
router.get('/inventory/low-stock', getLowStock)
module.exports = router;
