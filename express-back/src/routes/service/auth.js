const express = require('express');
const router = express.Router();
const ServiceAuthController = require('@/controllers/service/AuthController');
const { serviceAuth } = require('@/middleware/serviceAuth');

// 客服登录
router.post('/login', ServiceAuthController.login);

// 需要认证的客服路由
router.get('/profile', serviceAuth, ServiceAuthController.getProfile);
router.put('/profile', serviceAuth, ServiceAuthController.updateProfile);
router.post('/change-password', serviceAuth, ServiceAuthController.changePassword);
router.post('/logout', serviceAuth, ServiceAuthController.logout);

module.exports = router;
