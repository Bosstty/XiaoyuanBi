const express = require('express');
const router = express.Router();
const AdminAuthController = require('../../controllers/admin/AuthController');

// 管理员登录
router.post('/login', AdminAuthController.login);

// 需要认证的管理员路由
router.get('/profile', AdminAuthController.getProfile);
router.put('/profile', AdminAuthController.updateProfile);
router.post('/change-password', AdminAuthController.changePassword);
router.post('/logout', AdminAuthController.logout);
router.get('/permissions', AdminAuthController.getPermissions);

module.exports = router;
