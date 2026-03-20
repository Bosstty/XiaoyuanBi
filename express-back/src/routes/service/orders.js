const express = require('express');
const router = express.Router();
const ServiceOrderController = require('../../controllers/service/OrderController');

// 获取售后订单列表
router.get('/', ServiceOrderController.getAfterSalesOrders);

// 获取订单详情
router.get('/:id', ServiceOrderController.getOrderDetail);

// 处理订单状态
router.patch('/:id/status', ServiceOrderController.handleOrderStatus);

// 申请退款
router.post('/:id/refund', ServiceOrderController.processRefund);

// 补偿处理
router.post('/:id/compensate', ServiceOrderController.processCompensate);

module.exports = router;
