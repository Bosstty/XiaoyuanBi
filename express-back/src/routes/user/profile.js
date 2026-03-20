const express = require('express');
const AuthController = require('../../controllers/user/AuthController');
const { auth } = require('../../middleware/auth');

const router = express.Router();

// 用户个人资料相关接口
router.get('/', auth('user'), AuthController.getProfile); // 获取个人资料
router.put('/', auth('user'), AuthController.updateProfile); // 更新个人资料
router.post('/avatar', auth('user'), AuthController.uploadAvatar); // 上传头像

// 用户统计信息
router.get('/stats', auth('user'), AuthController.getUserStats); // 获取用户统计

module.exports = router;
