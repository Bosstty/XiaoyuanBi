const express = require('express');
const router = express.Router();
const DelivererEarningsController = require('@/controllers/deliverer/EarningsController');

// 获取收入统计
router.get('/', DelivererEarningsController.getEarnings);

// 获取收入详情（按天/周/月）
router.get('/detail', DelivererEarningsController.getEarningsDetail);

module.exports = router;
