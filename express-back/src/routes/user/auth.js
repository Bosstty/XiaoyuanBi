const express = require('express');
const router = express.Router();
const UserAuthController = require('@/controllers/user/AuthController');
const { authMiddleware } = require('@/middleware');
const { body } = require('express-validator');
const { handleValidation } = require('@/middleware/validation');
const path = require('path');
const { optimizeUploads } = require('@/middleware/optimizeUploads');
const { createUpload, resolveUploadDir } = require('@/utils/uploads');

const upload = createUpload({
    destination: () => resolveUploadDir('avatars'),
    filename: (req, file) => `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`,
    fileSize: 5 * 1024 * 1024,
});

// 用户注册
router.post('/register', UserAuthController.register);

// 用户登录
router.post('/login', UserAuthController.login);

router.post(
    '/send-verification-code',
    [
        body().custom(body => {
            const email = String(body.email || body.target || '')
                .trim()
                .toLowerCase();

            if (!email) {
                throw new Error('邮箱不能为空');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('邮箱格式不正确');
            }

            return true;
        }),
        handleValidation,
    ],
    UserAuthController.sendVerificationCode
);

router.post(
    '/verify-code',
    [
        body().custom(body => {
            const email = String(body.email || body.target || '')
                .trim()
                .toLowerCase();

            if (!email) {
                throw new Error('邮箱不能为空');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('邮箱格式不正确');
            }

            return true;
        }),
        body('code')
            .trim()
            .notEmpty()
            .withMessage('验证码不能为空')
            .matches(/^\d{6}$/)
            .withMessage('验证码必须为6位数字'),
        handleValidation,
    ],
    UserAuthController.verifyCode
);

router.post(
    '/forgot-password',
    [
        body().custom(body => {
            const email = String(body.email || body.target || '')
                .trim()
                .toLowerCase();

            if (!email) {
                throw new Error('邮箱不能为空');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('邮箱格式不正确');
            }

            return true;
        }),
        handleValidation,
    ],
    UserAuthController.sendPasswordResetEmail
);

router.get('/reset-password/:token', UserAuthController.verifyResetToken);

router.post(
    '/reset-password',
    [
        body().custom(body => {
            const token = String(body.token || body.resetToken || body.reset_token || '').trim();
            if (!token) {
                throw new Error('重置令牌不能为空');
            }

            const newPassword = body.new_password || body.newPassword;
            if (!newPassword || String(newPassword).length < 6) {
                throw new Error('新密码至少6位');
            }

            return true;
        }),
        handleValidation,
    ],
    UserAuthController.resetPassword
);

// 需要认证的用户路由
router.get('/profile', authMiddleware, UserAuthController.getProfile);
router.put('/profile', authMiddleware, UserAuthController.updateProfile);
router.post('/change-password', authMiddleware, UserAuthController.changePassword);
router.post(
    '/upload-avatar',
    authMiddleware,
    upload.single('avatar'),
    optimizeUploads({ maxWidth: 512, maxHeight: 512, quality: 76 }),
    UserAuthController.uploadAvatar
);
router.post('/logout', authMiddleware, UserAuthController.logout);
router.delete('/account', authMiddleware, UserAuthController.deleteAccount);
router.get('/stats', authMiddleware, UserAuthController.getUserStats);
router.post(
    '/verify-email',
    authMiddleware,
    [
        body().custom(body => {
            const email = String(body.email || body.target || '')
                .trim()
                .toLowerCase();

            if (!email) {
                throw new Error('邮箱不能为空');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('邮箱格式不正确');
            }

            return true;
        }),
        body('code')
            .trim()
            .notEmpty()
            .withMessage('验证码不能为空')
            .matches(/^\d{6}$/)
            .withMessage('验证码必须为6位数字'),
        handleValidation,
    ],
    UserAuthController.verifyCode
);

module.exports = router;
