const express = require('express');
const AuthController = require('@/controllers/user/AuthController');
const { auth } = require('@/middleware/auth');
const { optimizeUploads } = require('@/middleware/optimizeUploads');
const { body } = require('express-validator');
const { handleValidation } = require('@/middleware/validation');
const { createUpload, resolveUploadDir } = require('@/utils/uploads');

const router = express.Router();

const avatarUpload = createUpload({
    destination: () => resolveUploadDir('avatars'),
    filename: (req, file) => `${req.user.id}_${Date.now()}${require('path').extname(file.originalname)}`,
    fileSize: 5 * 1024 * 1024,
});

const studentVerificationUpload = createUpload({
    destination: () => resolveUploadDir('student-verifications'),
    filename: (req, file) => `${req.user.id}_${Date.now()}${require('path').extname(file.originalname)}`,
    fileSize: 5 * 1024 * 1024,
});

// 用户个人资料相关接口
router.get('/', auth('user'), AuthController.getProfile); // 获取个人资料
router.put('/', auth('user'), AuthController.updateProfile); // 更新个人资料
router.post(
    '/avatar',
    auth('user'),
    avatarUpload.single('avatar'),
    optimizeUploads({ maxWidth: 512, maxHeight: 512, quality: 76 }),
    AuthController.uploadAvatar
); // 上传头像
router.post(
    '/student-verification',
    auth('user'),
    studentVerificationUpload.single('student_card'),
    optimizeUploads({ maxWidth: 1800, maxHeight: 1800, quality: 78 }),
    AuthController.submitStudentVerification
); // 提交学生认证

router.post(
    '/email-change/verify-identity',
    auth('user'),
    [
        body('auth_method')
            .trim()
            .isIn(['password', 'email_code'])
            .withMessage('认证方式不正确'),
        handleValidation,
    ],
    AuthController.verifyEmailChangeIdentity
);

router.post(
    '/email-change/check-availability',
    auth('user'),
    [
        body().custom(value => {
            const email = String(value.new_email || value.newEmail || value.email || '')
                .trim()
                .toLowerCase();

            if (!email) {
                throw new Error('新邮箱不能为空');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('新邮箱格式不正确');
            }

            return true;
        }),
        handleValidation,
    ],
    AuthController.checkEmailChangeAvailability
);

router.post(
    '/email-change/send-code',
    auth('user'),
    [
        body('change_token').trim().notEmpty().withMessage('修改邮箱凭证不能为空'),
        body().custom(value => {
            const email = String(value.new_email || value.newEmail || value.email || '')
                .trim()
                .toLowerCase();

            if (!email) {
                throw new Error('新邮箱不能为空');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('新邮箱格式不正确');
            }

            return true;
        }),
        handleValidation,
    ],
    AuthController.sendEmailChangeVerificationCode
);

router.post(
    '/email-change/confirm',
    auth('user'),
    [
        body('change_token').trim().notEmpty().withMessage('修改邮箱凭证不能为空'),
        body().custom(value => {
            const email = String(value.new_email || value.newEmail || value.email || '')
                .trim()
                .toLowerCase();

            if (!email) {
                throw new Error('新邮箱不能为空');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('新邮箱格式不正确');
            }

            return true;
        }),
        body('code')
            .trim()
            .matches(/^\d{6}$/)
            .withMessage('验证码必须为6位数字'),
        handleValidation,
    ],
    AuthController.confirmEmailChange
);

// 用户统计信息
router.get('/stats', auth('user'), AuthController.getUserStats); // 获取用户统计
router.get('/users/:id', auth('user'), AuthController.getPublicUserProfile); // 获取公开用户详情

module.exports = router;
