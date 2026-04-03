// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController= require('../controllers/orderController');
const { authReq, adminReq } = require('../middleware/authMiddleWare');

// Semua route order memerlukan login
router.use(authReq);
// customer
router.post('/', orderController.addOrder); // Checkout
router.get('/get/:id', orderController.getOrderById);
router.post('/:id/payments', orderController.addPayment); // <-- URL Diubah
// admin
router.get('/', adminReq, orderController.getAllOrders);
router.post('/:id/status', adminReq, orderController.updateOrderStatus);

module.exports = router;