const express = require('express');
const router = express.Router();
const AdminDelivererController = require('../../controllers/admin/DelivererController');

// 获取配送员列表
router.get('/', AdminDelivererController.getDeliverers);

// 获取配送员详情
router.get('/:id', AdminDelivererController.getDelivererDetail);

// 审核配送员申请
router.patch('/:id/verify', AdminDelivererController.verifyDeliverer);

// 更新配送员状态
router.patch('/:id/status', AdminDelivererController.updateDelivererStatus);

// 删除/封禁配送员
router.delete('/:id', AdminDelivererController.deleteDeliverer);

// 获取配送员统计
router.get('/stats/overview', AdminDelivererController.getDelivererStats);

module.exports = router;
