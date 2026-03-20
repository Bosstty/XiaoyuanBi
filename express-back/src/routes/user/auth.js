const express = require('express');
const router = express.Router();
const UserAuthController = require('../../controllers/user/AuthController');

// 用户注册
router.post('/register', UserAuthController.register);

// 用户登录
router.post('/login', UserAuthController.login);

// 需要认证的用户路由
router.get('/profile', UserAuthController.getProfile);
router.put('/profile', UserAuthController.updateProfile);
router.post('/change-password', UserAuthController.changePassword);
router.post('/upload-avatar', UserAuthController.uploadAvatar);
router.post('/send-verification-code', UserAuthController.sendVerificationCode);
router.post('/verify-code', UserAuthController.verifyCode);
router.post('/wechat-login', UserAuthController.wechatLogin);
router.post('/wechat-oauth', UserAuthController.wechatOAuth);
router.post('/logout', UserAuthController.logout);
router.delete('/account', UserAuthController.deleteAccount);
router.get('/stats', UserAuthController.getUserStats);

// 设备管理
router.get('/devices', UserAuthController.getDevices);
router.post('/logout-device/:device_id', UserAuthController.logoutDevice);

// 密码重置
router.post('/forgot-password', UserAuthController.sendPasswordResetEmail);
router.get('/reset-password/:token', UserAuthController.verifyResetToken);
router.post('/reset-password', UserAuthController.resetPassword);

module.exports = router;
