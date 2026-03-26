const express = require('express');
const AuthController = require('../../controllers/user/AuthController');
const { auth } = require('../../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const avatarUploadDir = path.join(process.cwd(), 'uploads', 'avatars');
fs.mkdirSync(avatarUploadDir, { recursive: true });
const studentVerificationUploadDir = path.join(process.cwd(), 'uploads', 'student-verifications');
fs.mkdirSync(studentVerificationUploadDir, { recursive: true });

const avatarStorage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, avatarUploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`);
    },
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
});

const studentVerificationStorage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, studentVerificationUploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`);
    },
});

const studentVerificationUpload = multer({
    storage: studentVerificationStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
});

// 用户个人资料相关接口
router.get('/', auth('user'), AuthController.getProfile); // 获取个人资料
router.put('/', auth('user'), AuthController.updateProfile); // 更新个人资料
router.post('/avatar', auth('user'), avatarUpload.single('avatar'), AuthController.uploadAvatar); // 上传头像
router.post(
    '/student-verification',
    auth('user'),
    studentVerificationUpload.single('student_card'),
    AuthController.submitStudentVerification
); // 提交学生认证

// 用户统计信息
router.get('/stats', auth('user'), AuthController.getUserStats); // 获取用户统计
router.get('/users/:id', auth('user'), AuthController.getPublicUserProfile); // 获取公开用户详情

module.exports = router;
