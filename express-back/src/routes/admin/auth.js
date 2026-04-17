const express = require('express');
const router = express.Router();
const AdminAuthController = require('@/controllers/admin/AuthController');
const { adminAuthMiddleware } = require('@/middleware');

// 管理员登录
router.post('/login', AdminAuthController.login);

// 需要认证的管理员路由
router.get('/profile', adminAuthMiddleware, AdminAuthController.getProfile);
router.put('/profile', adminAuthMiddleware, AdminAuthController.updateProfile);
router.post('/change-password', adminAuthMiddleware, AdminAuthController.changePassword);
router.post('/logout', adminAuthMiddleware, AdminAuthController.logout);
router.get('/permissions', adminAuthMiddleware, AdminAuthController.getPermissions);

module.exports = router;
