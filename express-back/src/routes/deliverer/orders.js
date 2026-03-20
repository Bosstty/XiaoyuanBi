const express = require('express');
const router = express.Router();
const DelivererOrderController = require('../../controllers/deliverer/OrderController');

// 获取可接单列表
router.get('/available', DelivererOrderController.getAvailableOrders);

// 根据位置获取附近订单
router.get('/nearby', DelivererOrderController.getNearbyOrders);

// 接受订单
router.post('/:id/accept', DelivererOrderController.acceptOrder);

// 获取我的订单列表
router.get('/my-orders', DelivererOrderController.getMyOrders);

// 获取订单详情
router.get('/:id', DelivererOrderController.getOrderDetail);

// 更新订单状态
router.put('/:id/status', DelivererOrderController.updateOrderStatus);

// 开始取货
router.post('/:id/start-pickup', DelivererOrderController.startPickup);

// 确认取货
router.post('/:id/confirm-pickup', DelivererOrderController.confirmPickup);

// 开始配送
router.post('/:id/start-delivery', DelivererOrderController.startDelivery);

// 确认送达
router.post('/:id/confirm-delivery', DelivererOrderController.confirmDelivery);

// 上传配送照片
router.post('/:id/upload-proof', DelivererOrderController.uploadDeliveryProof);

// 申请取消订单
router.post('/:id/request-cancel', DelivererOrderController.requestCancel);

// 获取配送统计
router.get('/stats/overview', DelivererOrderController.getDeliveryStats);

// 获取今日订单
router.get('/today/orders', DelivererOrderController.getTodayOrders);

// 获取历史订单
router.get('/history/orders', DelivererOrderController.getHistoryOrders);

module.exports = router;
