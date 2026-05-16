const express = require('express');
const router = express.Router();
const ServiceDelivererController = require('@/controllers/service/DelivererController');

// 获取配送员列表
router.get('/', ServiceDelivererController.getDeliverers);

// 获取配送员详情
router.get('/:id', ServiceDelivererController.getDelivererDetail);

// 更新配送员状态
router.patch('/:id/status', ServiceDelivererController.updateStatus);

module.exports = router;
