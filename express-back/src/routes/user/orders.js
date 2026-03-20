const express = require('express');
const UserOrderController = require('../../controllers/user/OrderController');

// 订单管理路由
const router = express.Router();

// 创建订单
router.post('/', UserOrderController.createOrder);

// 获取我的订单
router.get('/my-orders', UserOrderController.getMyOrders);

// 获取订单统计
router.get('/stats', UserOrderController.getOrderStats);

// 查找附近配送员
router.get('/nearby-deliverers', UserOrderController.findNearbyDeliverers);

// 获取订单详情
router.get('/:id', UserOrderController.getOrderDetail);

// 取消订单
router.post('/:id/cancel', UserOrderController.cancelOrder);

// 确认订单完成
router.post('/:id/confirm', UserOrderController.confirmOrder);

// 评价订单
router.post('/:id/rate', UserOrderController.rateOrder);

// 申请退款
router.post('/:id/refund', UserOrderController.requestRefund);

module.exports = router;
