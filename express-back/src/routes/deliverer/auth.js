const express = require('express');
const router = express.Router();
const DelivererAuthController = require('../../controllers/deliverer/AuthController');

// 配送员登录
router.post('/login', DelivererAuthController.login);

// 需要认证的配送员路由
router.get('/profile', DelivererAuthController.getProfile);
router.put('/profile', DelivererAuthController.updateProfile);
router.post('/logout', DelivererAuthController.logout);

module.exports = router;
