const express = require('express');
const router = express.Router();
const UserAuthController = require('../../controllers/user/AuthController');
const { authMiddleware } = require('../../middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const avatarUploadDir = path.join(process.cwd(), 'uploads', 'avatars');
fs.mkdirSync(avatarUploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, avatarUploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
});

// 用户注册
router.post('/register', UserAuthController.register);

// 用户登录
router.post('/login', UserAuthController.login);

// 需要认证的用户路由
router.get('/profile', authMiddleware, UserAuthController.getProfile);
router.put('/profile', authMiddleware, UserAuthController.updateProfile);
router.post('/change-password', authMiddleware, UserAuthController.changePassword);
router.post('/upload-avatar', authMiddleware, upload.single('avatar'), UserAuthController.uploadAvatar);
router.post('/logout', authMiddleware, UserAuthController.logout);
router.delete('/account', authMiddleware, UserAuthController.deleteAccount);
router.get('/stats', authMiddleware, UserAuthController.getUserStats);

module.exports = router;
