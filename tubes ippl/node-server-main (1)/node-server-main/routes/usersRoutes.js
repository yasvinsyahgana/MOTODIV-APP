const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();
const {authReq, adminReq} = require('../middleware/authMiddleWare');

// Pemetaan URL ke ke fungsi router
router.get('/:id', authReq, userController.getUserById);
router.get('/',authReq, adminReq, userController.getUser);
router.patch('/update/:id', authReq, userController.updateUser);

module.exports = router;