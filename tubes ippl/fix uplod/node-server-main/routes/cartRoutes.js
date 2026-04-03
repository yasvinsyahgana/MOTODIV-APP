// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authReq } = require('../middleware/authMiddleWare');

// Semua route keranjang memerlukan login
router.use(authReq);

router.get('/', cartController.getCart);
router.post('/items', cartController.addToCart);
router.patch('/items/:productId', cartController.updateCartItem);
router.delete('/items/:productId', cartController.deleteCartItem);

module.exports = router;