const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {authReq} = require("../middleware/authMiddleWare")

router.post('/login', userController.userLogin);
router.post('/register', userController.userRegister);
router.get('/check-session', userController.checkSession);
router.post('/logout', authReq, userController.userLogout);

module.exports = router;
