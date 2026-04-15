const express = require('express');
const router = express.Router();
const ServiceTicketController = require('../../controllers/service/TicketController');

router.get('/:id', ServiceTicketController.getOrderDetail);
router.patch('/:id/status', ServiceTicketController.updateOrderStatus);

// 申请退款
router.post('/:id/refund', ServiceTicketController.processRefund);

// 投诉赔偿
router.post('/:id/compensation', ServiceTicketController.processCompensation);

// 补偿处理
router.post('/:id/compensate', ServiceTicketController.processCompensate);

module.exports = router;
