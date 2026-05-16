const express = require('express');
const router = express.Router();
const ServiceUserController = require('@/controllers/service/UserController');

// 获取用户列表
router.get('/', ServiceUserController.getUsers);

// 获取用户详情
router.get('/:id', ServiceUserController.getUserDetail);

// 封禁用户
router.post('/:id/ban', ServiceUserController.banUser);

module.exports = router;
