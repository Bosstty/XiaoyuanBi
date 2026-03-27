const express = require('express');
const router = express.Router();
const AdminOrderController = require('../../controllers/admin/OrderController');

// 获取订单列表
router.get('/', AdminOrderController.getOrders);

// 执行担保期订单结算
router.post('/settlements/run', AdminOrderController.runSettlementJob);

// 获取订单详情
router.get('/:id', AdminOrderController.getOrderDetail);

// 更新订单状态
router.patch('/:id/status', AdminOrderController.updateOrderStatus);

// 批量分配订单
router.post('/batch-assign', AdminOrderController.batchAssignOrders);

// 取消订单
router.delete('/:id', AdminOrderController.cancelOrder);

// 获取订单统计
router.get('/stats/overview', AdminOrderController.getOrderStats);

module.exports = router;
