// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// 1. Import Middleware Upload (PENTING: Tanpa { } )
const upload = require('../middleware/uploadMiddleware');

// 2. Import Auth jika diperlukan (sesuai stack trace error Anda)
const { authReq, adminReq } = require('../middleware/authMiddleWare');

// Route Get (Public)
router.get('/search', productController.getProductAll);
router.get('/search/:id', productController.getProductById);

// Route Add Product (Admin Only + Upload)
// URUTAN PENTING: Auth -> Admin -> Upload -> Controller
router.post('/',
    authReq,
    adminReq,
    upload.array('gambar', 5), // <--- Middleware ini yang mengisi req.body
    productController.addProduct
);

// Route Update & Delete (Admin Only)
router.patch('/:id',
    authReq,
    adminReq,
    upload.array('gambar', 5), // Tambahkan ini
    productController.updateProduct
);
router.delete('/:id', authReq, adminReq, productController.deleteProduct);

module.exports = router;