const express = require('express');
const router = express.Router();
const DelivererStatusController = require('@/controllers/deliverer/StatusController');

// 更新配送员状态（上线/下线）
router.post('/update', DelivererStatusController.updateStatus);

// 更新配送员位置
router.post('/location', DelivererStatusController.updateLocation);

// 获取当前状态
router.get('/', DelivererStatusController.getStatus);

module.exports = router;
